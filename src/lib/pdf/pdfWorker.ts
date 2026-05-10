"use client";

import { GlobalWorkerOptions } from "pdfjs-dist";

let configured = false;

export function configurePdfWorker(): void {
  if (configured) {
    return;
  }

  GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
  configured = true;
}
