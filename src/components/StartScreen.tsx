"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GripVertical, LockKeyhole, Plus, Trash2, Upload } from "lucide-react";
import { useEditorSession } from "@/context/EditorSessionContext";
import { loadSourceDocument } from "@/lib/pdf/loadSourceDocument";
import { formatFileSize } from "@/lib/utils/formatFileSize";
import type { SourceDocument } from "@/types/editor";

export function StartScreen(): JSX.Element {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { createSession } = useEditorSession();
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedDocuments = await Promise.all(
        fileList.map((file) => loadSourceDocument(file))
      );
      setDocuments((current) => [...current, ...loadedDocuments]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "We could not load one of those PDFs."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const reorderDocument = (fromIndex: number, toIndex: number) => {
    setDocuments((current) => {
      const next = [...current];
      const [movedDocument] = next.splice(fromIndex, 1);

      if (!movedDocument) {
        return current;
      }

      next.splice(toIndex, 0, movedDocument);
      return next;
    });
  };

  const handleStart = () => {
    if (documents.length === 0) {
      return;
    }

    createSession({ documents });
    router.push("/editor");
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
              account needed. Your files stay on your device.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
              <LockKeyhole aria-hidden="true" size={16} />
              Your PDFs stay in your browser.
            </div>
          </div>

          <div className="rounded-lg bg-white/80 p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 backdrop-blur sm:p-6">
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(event) => {
                if (event.target.files) {
                  void addFiles(event.target.files);
                }
                event.currentTarget.value = "";
              }}
            />
            <button
              className="flex min-h-44 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm transition hover:border-teal-500 hover:bg-teal-50/40"
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void addFiles(event.dataTransfer.files);
              }}
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <Upload aria-hidden="true" size={22} />
              </span>
              <span className="text-base font-semibold text-slate-950">
                Upload PDF
              </span>
              <span className="mt-2 text-sm text-slate-500">
                Add one or more PDFs, 25 MB each
              </span>
            </button>

            {error ? (
              <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {documents.length > 0 ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Combine PDFs
                  </h2>
                  <button
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                    type="button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Plus aria-hidden="true" size={16} />
                    Add another PDF
                  </button>
                </div>
                <div className="space-y-2">
                  {documents.map((document, index) => (
                    <div
                      key={document.id}
                      className={[
                        "flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm",
                        draggedIndex === index ? "opacity-50" : ""
                      ].join(" ")}
                      draggable
                      onDragStart={(event) => {
                        setDraggedIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromIndex = Number(
                          event.dataTransfer.getData("text/plain")
                        );
                        setDraggedIndex(null);
                        if (Number.isInteger(fromIndex) && fromIndex !== index) {
                          reorderDocument(fromIndex, index);
                        }
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                    >
                      <GripVertical
                        className="shrink-0 cursor-grab text-slate-400"
                        aria-hidden="true"
                        size={18}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {document.fileName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatFileSize(document.fileSize)} ·{" "}
                          {document.pageCount}{" "}
                          {document.pageCount === 1 ? "page" : "pages"}
                        </div>
                      </div>
                      <button
                        className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        type="button"
                        title="Remove PDF"
                        onClick={() =>
                          setDocuments((current) =>
                            current.filter((item) => item.id !== document.id)
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              type="button"
              disabled={documents.length === 0 || isLoading}
              onClick={handleStart}
            >
              {isLoading ? "Loading PDFs..." : "Start Editing"}
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
