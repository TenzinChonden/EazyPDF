"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PdfUploader } from "@/components/PdfUploader";
import { useEditorSession } from "@/context/EditorSessionContext";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function validatePdf(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return "Please choose a PDF file.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "That PDF is larger than 25 MB. Choose a smaller file for this MVP.";
  }

  return null;
}

export function StartScreen(): JSX.Element {
  const router = useRouter();
  const { createSession } = useEditorSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const handleFileSelected = (file: File) => {
    const validationError = validatePdf(file);
    setSelectedFile(validationError ? null : file);
    setError(validationError);
  };

  const handleStart = async () => {
    if (!selectedFile) {
      return;
    }

    setIsReading(true);
    setError(null);

    try {
      const pdfBytes = await selectedFile.arrayBuffer();
      createSession({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        pdfBytes
      });
      router.push("/editor");
    } catch {
      setError("We could not read that PDF. Please try another file.");
    } finally {
      setIsReading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_32rem),linear-gradient(180deg,#f8fafc,#eef2f7)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-sm font-bold text-white">
                EP
              </div>
              <span className="text-xl font-bold tracking-tight">EazyPDF</span>
            </div>
            <h1 className="max-w-xl text-5xl font-bold tracking-normal text-slate-950 sm:text-6xl">
              Edit PDFs in your browser.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Upload your PDF, add text, sign, highlight, and download. No
              account needed. Your file stays on your device.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
              <LockKeyhole aria-hidden="true" size={16} />
              Your PDF stays in your browser.
            </div>
          </div>

          <div className="rounded-lg bg-white/80 p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 backdrop-blur sm:p-6">
            <PdfUploader
              selectedFile={selectedFile}
              error={error}
              onFileSelected={handleFileSelected}
            />
            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              type="button"
              disabled={!selectedFile || isReading}
              onClick={handleStart}
            >
              {isReading ? "Starting..." : "Start Editing"}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
