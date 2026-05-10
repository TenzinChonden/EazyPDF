"use client";

import { Upload } from "lucide-react";
import { formatFileSize } from "@/lib/utils/formatFileSize";

type PdfUploaderProps = {
  selectedFile: File | null;
  error: string | null;
  onFileSelected: (file: File) => void;
};

export function PdfUploader({
  selectedFile,
  error,
  onFileSelected
}: PdfUploaderProps): JSX.Element {
  return (
    <label
      className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm transition hover:border-teal-500 hover:bg-teal-50/40"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files.item(0);
        if (file) {
          onFileSelected(file);
        }
      }}
    >
      <input
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) {
            onFileSelected(file);
          }
        }}
      />
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
        <Upload aria-hidden="true" size={22} />
      </span>
      <span className="text-base font-semibold text-slate-950">
        Drop a PDF here or choose a file
      </span>
      <span className="mt-2 text-sm text-slate-500">
        PDF files up to 25 MB
      </span>
      {selectedFile ? (
        <span className="mt-5 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {selectedFile.name} · {formatFileSize(selectedFile.size)}
        </span>
      ) : null}
      {error ? (
        <span className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
