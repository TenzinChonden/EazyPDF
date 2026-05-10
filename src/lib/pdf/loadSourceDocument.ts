"use client";

import { getDocument } from "pdfjs-dist";
import { configurePdfWorker } from "@/lib/pdf/pdfWorker";
import type { SourceDocument } from "@/types/editor";

const MAX_PDF_SIZE = 25 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function loadSourceDocument(file: File): Promise<SourceDocument> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = SUPPORTED_IMAGE_TYPES.has(file.type);

  if (!isPdf && !isImage) {
    throw new Error("Please choose a PDF, JPEG, PNG, or WebP file.");
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new Error("That file is larger than 25 MB. Choose a smaller file.");
  }

  if (isImage) {
    return loadImageSourceDocument(file);
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
      type: "pdf",
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

async function loadImageSourceDocument(file: File): Promise<SourceDocument> {
  const imageBytes = await file.arrayBuffer();
  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight
          });
        };
        image.onerror = () => reject(new Error("Could not load that image."));
        image.src = objectUrl;
      }
    );

    return {
      id: createClientId(),
      type: "image",
      fileName: file.name,
      fileSize: file.size,
      imageBytes,
      mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
      width: dimensions.width,
      height: dimensions.height,
      pageCount: 1
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
