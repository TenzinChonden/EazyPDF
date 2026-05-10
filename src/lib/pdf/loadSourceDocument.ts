"use client";

import { getDocument } from "pdfjs-dist";
import { configurePdfWorker } from "@/lib/pdf/pdfWorker";
import type { SourceDocument } from "@/types/editor";

const MAX_PDF_SIZE = 25 * 1024 * 1024;

export function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function loadSourceDocument(file: File): Promise<SourceDocument> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("Please choose a PDF file.");
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new Error("That PDF is larger than 25 MB. Choose a smaller file.");
  }

  const pdfBytes = await file.arrayBuffer();
  configurePdfWorker();

  const loadingTask = getDocument({
    data: new Uint8Array(pdfBytes.slice(0))
  });

  try {
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    await pdfDocument.destroy();

    return {
      id: createClientId(),
      fileName: file.name,
      fileSize: file.size,
      pdfBytes,
      pageCount
    };
  } catch {
    throw new Error("We could not load that PDF. Please try another file.");
  } finally {
    loadingTask.destroy();
  }
}
