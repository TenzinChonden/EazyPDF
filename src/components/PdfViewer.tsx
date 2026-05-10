"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "@/components/PdfPage";
import { useEditorSession } from "@/context/EditorSessionContext";
import { configurePdfWorker } from "@/lib/pdf/pdfWorker";
import type { EditorTool } from "@/types/editor";

type PdfViewerProps = {
  activeTool: EditorTool;
  onDocumentLoaded: (pageCount: number) => void;
  onDocumentReady: (pdfDocument: PDFDocumentProxy | null) => void;
  onPageRef: (pageNumber: number, element: HTMLDivElement | null) => void;
  onTextCreated: () => void;
};

export function PdfViewer({
  activeTool,
  onDocumentLoaded,
  onDocumentReady,
  onPageRef,
  onTextCreated
}: PdfViewerProps): JSX.Element {
  const { session, initializePageOrder, setCurrentPage } = useEditorSession();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageElements = useRef<Record<number, HTMLDivElement | null>>({});
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pdfBytes = session?.pdfBytes;
  const sessionId = session?.sessionId;

  useEffect(() => {
    if (!pdfBytes || !sessionId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    configurePdfWorker();

    const loadingTask = getDocument({
      data: new Uint8Array(pdfBytes.slice(0))
    });

    loadingTask.promise
      .then((loadedPdf) => {
        if (cancelled) {
          loadedPdf.destroy();
          return;
        }

        setPdfDocument(loadedPdf);
        onDocumentLoaded(loadedPdf.numPages);
        initializePageOrder(loadedPdf.numPages);
        onDocumentReady(loadedPdf);
      })
      .catch(() => {
        if (!cancelled) {
          setError("We could not render this PDF in the browser.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      onDocumentReady(null);
      loadingTask.destroy();
    };
  }, [
    initializePageOrder,
    onDocumentLoaded,
    onDocumentReady,
    pdfBytes,
    sessionId
  ]);

  useEffect(() => {
    if (!pdfDocument || !scrollContainerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const pageNumber = Number(
          visibleEntry?.target.getAttribute("data-page-number")
        );

        if (pageNumber) {
          setCurrentPage(pageNumber);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.25, 0.5, 0.75],
        rootMargin: "-20% 0px -55% 0px"
      }
    );

    Object.values(pageElements.current).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [pdfDocument, session?.scale, setCurrentPage]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm font-medium text-slate-500">
        Rendering PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm font-medium text-red-700">
        {error}
      </div>
    );
  }

  if (!pdfDocument || !session) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        No PDF loaded.
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto px-4 py-6">
      <div className="mx-auto flex w-max min-w-full flex-col items-center gap-8">
        {(session.pageOrder.length
          ? session.pageOrder
          : Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1)
        ).map((originalPageNumber, index) => (
          <PdfPage
            key={`${session.sessionId}-${originalPageNumber}`}
            activeTool={activeTool}
            displayPageNumber={index + 1}
            pageNumber={originalPageNumber}
            pdfDocument={pdfDocument}
            scale={session.scale}
            onPageRef={(element) => {
              pageElements.current[originalPageNumber] = element;
              onPageRef(originalPageNumber, element);
            }}
            onTextCreated={onTextCreated}
          />
        ))}
      </div>
    </div>
  );
}
