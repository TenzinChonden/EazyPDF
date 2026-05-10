import type { TextAnnotation, TextFontFamily } from "@/types/editor";

type InlineStylePatch = {
  fontFamily?: TextFontFamily;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
};

const savedSelections = new Map<string, Range>();

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeRichTextHtml(html: string): string {
  if (typeof document === "undefined") {
    return escapeHtml(stripHtml(html));
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizeNode(template.content);
  return template.innerHTML;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function saveRichTextSelection(annotationId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const editor = getRichTextEditor(annotationId);

  if (range && editor?.contains(range.commonAncestorContainer)) {
    savedSelections.set(annotationId, range.cloneRange());
  }
}

export function applyInlineStyleToSelection(
  annotation: TextAnnotation,
  stylePatch: InlineStylePatch
): TextAnnotation {
  const editor = getRichTextEditor(annotation.id);
  const range = restoreRichTextSelection(annotation.id);

  if (!editor || !range || range.collapsed) {
    return {
      ...annotation,
      ...defaultStylePatch(stylePatch)
    };
  }

  const span = document.createElement("span");
  applyStyle(span, stylePatch);
  span.append(range.extractContents());
  range.insertNode(span);
  range.selectNodeContents(span);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  savedSelections.set(annotation.id, range.cloneRange());

  const html = sanitizeRichTextHtml(editor.innerHTML);
  const plainText = editor.innerText;

  return {
    ...annotation,
    html,
    plainText,
    text: plainText,
    ...defaultStylePatch(stylePatch)
  };
}

export function getRichTextEditor(annotationId: string): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document.getElementById(`rich-text-editor-${annotationId}`);
}

function restoreRichTextSelection(annotationId: string): Range | null {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();
  const savedRange = savedSelections.get(annotationId);
  const editor = getRichTextEditor(annotationId);

  if (!savedRange || !editor?.contains(savedRange.commonAncestorContainer)) {
    return null;
  }

  selection?.removeAllRanges();
  selection?.addRange(savedRange);
  return savedRange;
}

function sanitizeNode(node: Node): void {
  const allowedTags = new Set(["BR", "DIV", "P", "SPAN", "B", "STRONG", "I", "EM"]);

  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      return;
    }

    const element = child as HTMLElement;
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    const style = sanitizeStyle(element);
    Array.from(element.attributes).forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });

    if (style) {
      element.setAttribute("style", style);
    }

    sanitizeNode(element);
  });
}

function sanitizeStyle(element: HTMLElement): string {
  const styles: string[] = [];
  const fontFamily = normalizeFontFamily(element.style.fontFamily);
  const fontSize = normalizeFontSize(element.style.fontSize);
  const color = normalizeColor(element.style.color);
  const fontWeight = element.style.fontWeight;
  const fontStyle = element.style.fontStyle;

  if (fontFamily) {
    styles.push(`font-family: ${fontFamily}`);
  }

  if (fontSize) {
    styles.push(`font-size: ${fontSize}px`);
  }

  if (color) {
    styles.push(`color: ${color}`);
  }

  if (fontWeight === "bold" || Number(fontWeight) >= 600) {
    styles.push("font-weight: 700");
  }

  if (fontStyle === "italic") {
    styles.push("font-style: italic");
  }

  return styles.join("; ");
}

function applyStyle(element: HTMLElement, stylePatch: InlineStylePatch): void {
  if (stylePatch.fontFamily) {
    element.style.fontFamily = stylePatch.fontFamily;
  }

  if (stylePatch.fontSize) {
    element.style.fontSize = `${stylePatch.fontSize}px`;
  }

  if (stylePatch.color) {
    element.style.color = stylePatch.color;
  }

  if (typeof stylePatch.bold === "boolean") {
    element.style.fontWeight = stylePatch.bold ? "700" : "400";
  }

  if (typeof stylePatch.italic === "boolean") {
    element.style.fontStyle = stylePatch.italic ? "italic" : "normal";
  }
}

function defaultStylePatch(stylePatch: InlineStylePatch): Partial<TextAnnotation> {
  return {
    ...(stylePatch.fontFamily ? { defaultFontFamily: stylePatch.fontFamily } : {}),
    ...(stylePatch.fontSize ? { defaultFontSize: stylePatch.fontSize } : {}),
    ...(stylePatch.color ? { defaultColor: stylePatch.color } : {}),
    ...(typeof stylePatch.bold === "boolean" ? { bold: stylePatch.bold } : {}),
    ...(typeof stylePatch.italic === "boolean" ? { italic: stylePatch.italic } : {})
  };
}

function normalizeFontFamily(value: string): TextFontFamily | null {
  const cleaned = value.replace(/["']/g, "").split(",")[0]?.trim();
  const allowed: TextFontFamily[] = [
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

  return allowed.find((font) => font.toLowerCase() === cleaned.toLowerCase()) ?? null;
}

function normalizeFontSize(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 8 && parsed <= 96
    ? Math.round(parsed)
    : null;
}

function normalizeColor(value: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toUpperCase();
  }

  const match = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) {
    return null;
  }

  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
