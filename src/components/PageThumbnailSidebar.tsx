"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

type PageThumbnailSidebarProps = {
  pdfDocument: PDFDocumentProxy | null;
  pageCount: number;
  pageOrder: number[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
};

export function PageThumbnailSidebar({
  pdfDocument,
  pageCount,
  pageOrder,
  currentPage,
  onSelectPage,
  onReorderPages
}: PageThumbnailSidebarProps): JSX.Element {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const orderedPages = pageOrder.length
    ? pageOrder
    : Array.from({ length: pageCount || 1 }, (_, index) => index + 1);

  return (
    <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 md:block">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Pages
      </div>
      <div className="space-y-3">
        {orderedPages.map((pageNumber, index) => {
          return (
            <button
              key={`${pageNumber}-${index}`}
              className={[
                "w-full cursor-grab rounded-md border p-2 text-left transition active:cursor-grabbing",
                currentPage === pageNumber
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
                dragOverIndex === index ? "ring-2 ring-blue-400" : "",
                draggedIndex === index ? "opacity-50" : ""
              ].join(" ")}
              type="button"
              draggable
              onDragStart={(event) => {
                setDraggedIndex(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(event) => {
                event.preventDefault();
                const fromIndex = Number(
                  event.dataTransfer.getData("text/plain")
                );
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
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onClick={() => onSelectPage(pageNumber)}
            >
              {pdfDocument ? (
                <PageThumbnail
                  pdfDocument={pdfDocument}
                  pageNumber={pageNumber}
                />
              ) : (
                <div className="h-32 rounded-sm bg-slate-200" />
              )}
              <div className="mt-2 text-center text-xs font-semibold text-slate-600">
                Page {index + 1}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PageThumbnail({
  pdfDocument,
  pageNumber
}: {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;

    async function renderThumbnail() {
      setIsRendering(true);
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.22 });
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
  }, [pageNumber, pdfDocument]);

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
