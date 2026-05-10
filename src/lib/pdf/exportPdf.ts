import { degrees, PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import { stripHtml } from "@/lib/richText/html";
import type { EditorSession, PageRef, TextAnnotation, TextFontFamily } from "@/types/editor";

type TextRun = {
  text: string;
  fontFamily: TextFontFamily;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  lineBreak?: boolean;
};

function safeFileName(fileName: string): string {
  return fileName.trim() || "document.pdf";
}

export async function exportEditedPdf(session: EditorSession): Promise<Blob> {
  return generateEditedPdfBlob(session);
}

export async function generateEditedPdfBlob(
  session: EditorSession
): Promise<Blob> {
  if (process.env.NODE_ENV === "development") {
    console.info("EazyPDF export", {
      sourceDocuments: session.documents.length,
      exportedPages: session.pageOrder.length,
      annotations: session.annotations.length
    });
  }

  const outputPdf = await PDFDocument.create();
  const fontCache = new Map<StandardFonts, PDFFont>();
  const sourcePdfCache = new Map<string, PDFDocument>();

  for (const pageRef of session.pageOrder) {
    const sourceDocument = session.documents.find(
      (document) => document.id === pageRef.sourceDocumentId
    );

    if (!sourceDocument) {
      continue;
    }

    const sourcePdf =
      sourcePdfCache.get(sourceDocument.id) ??
      (await PDFDocument.load(sourceDocument.pdfBytes.slice(0)));
    flattenFormAppearances(sourcePdf);
    sourcePdfCache.set(sourceDocument.id, sourcePdf);

    const [copiedPage] = await outputPdf.copyPages(sourcePdf, [
      pageRef.sourcePageIndex
    ]);
    const originalRotation = copiedPage.getRotation().angle;
    copiedPage.setRotation(degrees((originalRotation + pageRef.rotation) % 360));
    outputPdf.addPage(copiedPage);

    const pageAnnotations = session.annotations.filter(
      (annotation) => annotation.pageId === pageRef.id
    );

    for (const annotation of pageAnnotations) {
      await drawTextAnnotation(
        annotation,
        copiedPage,
        pageRef,
        session,
        fontCache,
        outputPdf
      );
    }
  }

  const bytes = await outputPdf.save();
  const pdfBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(pdfBuffer).set(bytes);
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

function flattenFormAppearances(sourcePdf: PDFDocument): void {
  try {
    const form = sourcePdf.getForm();
    const fields = form.getFields();

    if (fields.length > 0) {
      form.flatten();
    }
  } catch {
    // Some PDFs contain XFA, unusual widgets, optional content, or broken form
    // structures. Normal page content is still copied directly below; flattening
    // is best-effort so unsupported forms never block export.
  }
}

async function drawTextAnnotation(
  annotation: TextAnnotation,
  pdfPage: ReturnType<PDFDocument["getPages"]>[number],
  pageRef: PageRef,
  session: EditorSession,
  fontCache: Map<StandardFonts, PDFFont>,
  pdfDoc: PDFDocument
): Promise<void> {
  const renderedSize = session.pageViewports[annotation.pageId];

  if (!renderedSize) {
    return;
  }

  const { width: pdfPageWidth, height: pdfPageHeight } = pdfPage.getSize();
  const scaleX = pdfPageWidth / renderedSize.width;
  const scaleY = pdfPageHeight / renderedSize.height;
  const pdfX = annotation.x * scaleX;
  const pdfTopY = pdfPageHeight - annotation.y * scaleY;
  const pdfBottomY = pdfPageHeight - (annotation.y + annotation.height) * scaleY;
  const runScale = Math.min(scaleX, scaleY);

  // Annotation coordinates are stored in the rendered browser page coordinate
  // space. For rotated pages this MVP keeps drawing in that simple coordinate
  // space after page rotation, which is reliable and non-crashing but not a full
  // geometric remap of annotations around the rotated media box.
  void pageRef;

  if (!annotation.backgroundTransparent) {
    const background = hexToRgb(annotation.backgroundColor);
    pdfPage.drawRectangle({
      x: pdfX,
      y: pdfBottomY,
      width: annotation.width * scaleX,
      height: annotation.height * scaleY,
      color: rgb(background.r, background.g, background.b)
    });
  }

  // This MVP treats rich text as a flat sequence of styled runs. It preserves
  // inline font/color/style and line breaks, but does not implement HTML layout,
  // wrapping, lists, alignment, or nested block spacing.
  const runs = parseRichTextRuns(annotation);
  let cursorX = pdfX;
  let cursorY = pdfTopY - annotation.defaultFontSize * runScale;
  const lineStartX = pdfX;

  for (const run of runs) {
    if (run.lineBreak) {
      cursorX = lineStartX;
      cursorY -= run.fontSize * runScale * 1.25;
      continue;
    }

    if (!run.text) {
      continue;
    }

    const standardFont = getStandardFont(
      run.fontFamily,
      run.bold,
      run.italic
    );
    const font =
      fontCache.get(standardFont) ?? (await pdfDoc.embedFont(standardFont));
    fontCache.set(standardFont, font);
    const color = hexToRgb(run.color);
    const size = run.fontSize * runScale;

    pdfPage.drawText(run.text, {
      x: cursorX,
      y: cursorY,
      size,
      color: rgb(color.r, color.g, color.b),
      font
    });
    cursorX += font.widthOfTextAtSize(run.text, size);
  }
}

function getStandardFont(
  fontFamily: TextFontFamily,
  bold: boolean,
  italic: boolean
): StandardFonts {
  const mappedFamily = mapFontFamily(fontFamily);

  if (mappedFamily === "Courier") {
    if (bold && italic) {
      return StandardFonts.CourierBoldOblique;
    }

    if (bold) {
      return StandardFonts.CourierBold;
    }

    if (italic) {
      return StandardFonts.CourierOblique;
    }

    return StandardFonts.Courier;
  }

  if (mappedFamily === "Times Roman") {
    if (bold && italic) {
      return StandardFonts.TimesRomanBoldItalic;
    }

    if (bold) {
      return StandardFonts.TimesRomanBold;
    }

    if (italic) {
      return StandardFonts.TimesRomanItalic;
    }

    return StandardFonts.TimesRoman;
  }

  if (bold && italic) {
    return StandardFonts.HelveticaBoldOblique;
  }

  if (bold) {
    return StandardFonts.HelveticaBold;
  }

  if (italic) {
    return StandardFonts.HelveticaOblique;
  }

  return StandardFonts.Helvetica;
}

function parseRichTextRuns(annotation: TextAnnotation): TextRun[] {
  const fallbackRun: TextRun = {
    text: annotation.plainText || annotation.text || stripHtml(annotation.html),
    fontFamily: annotation.defaultFontFamily,
    fontSize: annotation.defaultFontSize,
    color: annotation.defaultColor,
    bold: annotation.bold,
    italic: annotation.italic
  };

  if (typeof DOMParser === "undefined") {
    return [fallbackRun];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(annotation.html, "text/html");
  const runs: TextRun[] = [];

  document.body.childNodes.forEach((node) => {
    collectRuns(node, fallbackRun, runs);
  });

  return runs.length > 0 ? runs : [fallbackRun];
}

function collectRuns(node: Node, inherited: TextRun, runs: TextRun[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    runs.push({ ...inherited, text: node.textContent ?? "" });
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as HTMLElement;
  const nextRun = applyElementStyle(element, inherited);

  if (element.tagName === "BR") {
    runs.push({ ...nextRun, text: "", lineBreak: true });
    return;
  }

  element.childNodes.forEach((child) => collectRuns(child, nextRun, runs));

  if (element.tagName === "DIV" || element.tagName === "P") {
    runs.push({ ...nextRun, text: "", lineBreak: true });
  }
}

function applyElementStyle(element: HTMLElement, inherited: TextRun): TextRun {
  return {
    ...inherited,
    fontFamily: parseFontFamily(element.style.fontFamily) ?? inherited.fontFamily,
    fontSize: parseFontSize(element.style.fontSize) ?? inherited.fontSize,
    color: parseColor(element.style.color) ?? inherited.color,
    bold:
      element.tagName === "B" ||
      element.tagName === "STRONG" ||
      element.style.fontWeight === "bold" ||
      Number(element.style.fontWeight) >= 600 ||
      inherited.bold,
    italic:
      element.tagName === "I" ||
      element.tagName === "EM" ||
      element.style.fontStyle === "italic" ||
      inherited.italic
  };
}

function mapFontFamily(fontFamily: TextFontFamily): "Helvetica" | "Times Roman" | "Courier" {
  if (fontFamily === "Courier" || fontFamily === "Monospace") {
    return "Courier";
  }

  if (
    fontFamily === "Times Roman" ||
    fontFamily === "Georgia" ||
    fontFamily === "Garamond"
  ) {
    return "Times Roman";
  }

  return "Helvetica";
}

function parseFontFamily(value: string): TextFontFamily | null {
  const cleaned = value.replace(/["']/g, "").split(",")[0]?.trim();
  const fonts: TextFontFamily[] = [
    "Helvetica",
    "Times Roman",
    "Courier",
    "Arial",
    "Georgia",
    "Verdana",
    "Trebuchet MS",
    "Garamond",
    "Monospace"
  ];

  return fonts.find((font) => font.toLowerCase() === cleaned.toLowerCase()) ?? null;
}

function parseFontSize(value: string): number | null {
  const size = Number.parseFloat(value);
  return Number.isFinite(size) ? size : null;
}

function parseColor(value: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  const match = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) {
    return null;
  }

  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) / 255,
    g: Number.parseInt(normalized.slice(2, 4), 16) / 255,
    b: Number.parseInt(normalized.slice(4, 6), 16) / 255
  };
}

export function downloadBlob(blob: Blob, originalFileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `edited-${safeFileName(originalFileName)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function printBlob(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = objectUrl;

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(objectUrl);
    }, 1000);
  };

  document.body.appendChild(iframe);
}
