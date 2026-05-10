"use client";

import JSZip from "jszip";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { configurePdfWorker } from "@/lib/pdf/pdfWorker";
import { downloadBlob, generateEditedPdfBlob } from "@/lib/pdf/exportPdf";
import type { EditorSession } from "@/types/editor";

export type ImageExportFormat = "png" | "jpeg";

const IMAGE_EXPORT_SCALE = 2.5;
const JPEG_QUALITY = 0.92;

export async function exportCurrentPageAsImage(
  session: EditorSession,
  format: ImageExportFormat
): Promise<void> {
  const pdfBlob = await generateEditedPdfBlob(session);
  const pageNumber = getCurrentExportPageNumber(session);
  const imageBlob = await renderPdfPageToImageBlob(
    pdfBlob,
    pageNumber,
    format,
    IMAGE_EXPORT_SCALE
  );
  downloadBlob(
    imageBlob,
    `eazypdf-page-${pageNumber}.${format === "jpeg" ? "jpg" : "png"}`
  );
}

export async function exportAllPagesAsImagesZip(
  session: EditorSession,
  format: ImageExportFormat,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<void> {
  const pdfBlob = await generateEditedPdfBlob(session);
  const pdfDocument = await loadPdfDocumentFromBlob(pdfBlob);
  const zip = new JSZip();
  const extension = format === "jpeg" ? "jpg" : "png";

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      onProgress?.(pageNumber, pdfDocument.numPages);
      const imageBlob = await renderPdfPageFromDocumentToImageBlob(
        pdfDocument,
        pageNumber,
        format,
        IMAGE_EXPORT_SCALE
      );
      zip.file(`page-${String(pageNumber).padStart(3, "0")}.${extension}`, imageBlob);
    }
  } finally {
    await pdfDocument.destroy();
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `eazypdf-pages-${format === "jpeg" ? "jpeg" : "png"}.zip`);
}

export async function renderPdfPageToImageBlob(
  pdfBlob: Blob,
  pageNumber: number,
  format: ImageExportFormat,
  scale = IMAGE_EXPORT_SCALE
): Promise<Blob> {
  const pdfDocument = await loadPdfDocumentFromBlob(pdfBlob);

  try {
    return await renderPdfPageFromDocumentToImageBlob(
      pdfDocument,
      pageNumber,
      format,
      scale
    );
  } finally {
    await pdfDocument.destroy();
  }
}

async function loadPdfDocumentFromBlob(pdfBlob: Blob): Promise<PDFDocumentProxy> {
  configurePdfWorker();
  const bytes = await pdfBlob.arrayBuffer();
  const loadingTask = getDocument({ data: new Uint8Array(bytes) });
  return loadingTask.promise;
}

async function renderPdfPageFromDocumentToImageBlob(
  pdfDocument: PDFDocumentProxy,
  pageNumber: number,
  format: ImageExportFormat,
  scale: number
): Promise<Blob> {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create image export canvas.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  if (format === "jpeg") {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvasContext: context, viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not create exported image."));
        }
      },
      format === "jpeg" ? "image/jpeg" : "image/png",
      format === "jpeg" ? JPEG_QUALITY : undefined
    );
  });
}

function getCurrentExportPageNumber(session: EditorSession): number {
  const currentIndex = session.pageOrder.findIndex(
    (page) => page.id === session.currentPageId
  );
  return currentIndex >= 0 ? currentIndex + 1 : 1;
}
