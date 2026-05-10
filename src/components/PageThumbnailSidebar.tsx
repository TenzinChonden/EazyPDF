"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { useEditorSession } from "@/context/EditorSessionContext";
import { loadSourceDocument } from "@/lib/pdf/loadSourceDocument";
import type { PageRef, SourceDocument } from "@/types/editor";

type PdfDocumentMap = Record<string, PDFDocumentProxy>;

type PageThumbnailSidebarProps = {
  pdfDocuments: PdfDocumentMap;
  pageOrder: PageRef[];
  currentPageId: string | null;
  onAddDocument: (document: SourceDocument) => void;
  onSelectPage: (pageId: string) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
};

export function PageThumbnailSidebar({
  pdfDocuments,
  pageOrder,
  currentPageId,
  onAddDocument,
  onSelectPage,
  onReorderPages
}: PageThumbnailSidebarProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    session,
    selectedPageIds,
    togglePageSelection,
    selectAllPages,
    clearPageSelection
  } = useEditorSession();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const lastDragClientY = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const selectedCount = selectedPageIds.length;

  useEffect(() => {
    return () => stopAutoScroll();
  }, []);

  const handleAddFile = async (file: File) => {
    setError(null);

    try {
      const document = await loadSourceDocument(file);
      onAddDocument(document);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "We could not add that file."
      );
    }
  };

  return (
    <aside
      ref={sidebarRef}
      className="hidden w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 md:block"
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) {
            void handleAddFile(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <div className="mb-3 space-y-2">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <Plus aria-hidden="true" size={16} />
          Add File
        </button>
        <div className="flex items-center justify-between gap-2 text-xs">
          <button
            className="font-semibold text-slate-700 hover:text-slate-950"
            type="button"
            onClick={selectAllPages}
          >
            Select all
          </button>
          {selectedCount > 0 ? (
            <button
              className="font-semibold text-slate-500 hover:text-slate-950"
              type="button"
              onClick={clearPageSelection}
            >
              Clear selection
            </button>
          ) : null}
        </div>
        <div className="text-xs font-medium text-slate-500">
          {selectedCount} selected
        </div>
        {error ? (
          <div className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {pageOrder.map((pageRef, index) => {
          const sourceDocument = session?.documents.find(
            (document) => document.id === pageRef.sourceDocumentId
          );
          const pdfDocument = pdfDocuments[pageRef.sourceDocumentId];
          const isSelected = selectedPageIds.includes(pageRef.id);

          return (
            <button
              key={pageRef.id}
              className={[
                "w-full cursor-grab rounded-md border p-2 text-left transition active:cursor-grabbing",
                currentPageId === pageRef.id
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
                isSelected ? "ring-2 ring-blue-500" : "",
                dragOverIndex === index ? "ring-2 ring-blue-400" : "",
                draggedIndex === index ? "opacity-50" : ""
              ].join(" ")}
              type="button"
              draggable
              onDragStart={(event) => {
                setDraggedIndex(index);
                lastDragClientY.current = event.clientY;
                startAutoScroll();
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                lastDragClientY.current = event.clientY;
                event.dataTransfer.dropEffect = "move";
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = Number(
                  event.dataTransfer.getData("text/plain")
                );
                stopAutoScroll();
                setDraggedIndex(null);
                setDragOverIndex(null);

                if (
                  Number.isInteger(fromIndex) &&
                  fromIndex !== index &&
                  fromIndex >= 0
                ) {
                  onReorderPages(fromIndex, index);
                }
              }}
              onDragEnd={() => {
                stopAutoScroll();
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onClick={() => onSelectPage(pageRef.id)}
            >
              <div className="mb-2 flex items-center justify-between">
                <input
                  className="h-4 w-4 accent-blue-600"
                  type="checkbox"
                  checked={isSelected}
                  aria-label={`Select page ${index + 1}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => togglePageSelection(pageRef.id)}
                />
                <span className="text-xs font-semibold text-slate-500">
                  Page {index + 1}
                </span>
              </div>
              {sourceDocument?.type === "image" ? (
                <ImageThumbnail sourceDocument={sourceDocument} pageRef={pageRef} />
              ) : pdfDocument ? (
                <PageThumbnail pdfDocument={pdfDocument} pageRef={pageRef} />
              ) : (
                <div className="h-32 rounded-sm bg-slate-200" />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );

  function startAutoScroll(): void {
    if (animationFrameRef.current !== null) {
      return;
    }

    const step = () => {
      const sidebar = sidebarRef.current;
      const clientY = lastDragClientY.current;

      if (sidebar && clientY !== null) {
        const rect = sidebar.getBoundingClientRect();
        const edgeSize = 40;
        const maxSpeed = 14;

        if (clientY < rect.top + edgeSize) {
          const intensity = (rect.top + edgeSize - clientY) / edgeSize;
          sidebar.scrollTop -= Math.ceil(maxSpeed * intensity);
        } else if (clientY > rect.bottom - edgeSize) {
          const intensity = (clientY - (rect.bottom - edgeSize)) / edgeSize;
          sidebar.scrollTop += Math.ceil(maxSpeed * intensity);
        }
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }

  function stopAutoScroll(): void {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastDragClientY.current = null;
  }
}

function ImageThumbnail({
  sourceDocument,
  pageRef
}: {
  sourceDocument: Extract<SourceDocument, { type: "image" }>;
  pageRef: PageRef;
}): JSX.Element {
  return (
    <div className="relative min-h-24 overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200">
      <img
        className="block w-full object-contain"
        alt={sourceDocument.fileName}
        src={createImageDataUrl(sourceDocument)}
        style={{ transform: `rotate(${pageRef.rotation}deg)` }}
      />
    </div>
  );
}

function PageThumbnail({
  pdfDocument,
  pageRef
}: {
  pdfDocument: PDFDocumentProxy;
  pageRef: PageRef;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;

    async function renderThumbnail() {
      setIsRendering(true);
      const page = await pdfDocument.getPage(pageRef.sourcePageIndex + 1);
      const viewport = page.getViewport({
        scale: 0.22,
        rotation: pageRef.rotation
      });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");

      if (!canvas || !context || cancelled) {
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;

      if (!cancelled) {
        setIsRendering(false);
      }
    }

    renderThumbnail().catch(() => {
      if (!cancelled) {
        setIsRendering(false);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageRef.rotation, pageRef.sourcePageIndex, pdfDocument]);

  return (
    <div className="relative min-h-24 overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200">
      <canvas ref={canvasRef} className="block w-full" />
      {isRendering ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs font-medium text-slate-500">
          Loading
        </div>
      ) : null}
    </div>
  );
}

function createImageDataUrl(sourceDocument: Extract<SourceDocument, { type: "image" }>): string {
  const bytes = new Uint8Array(sourceDocument.imageBytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${sourceDocument.mimeType};base64,${btoa(binary)}`;
}
