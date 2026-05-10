"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "@/components/PdfPage";
import { useEditorSession } from "@/context/EditorSessionContext";
import { configurePdfWorker } from "@/lib/pdf/pdfWorker";
import type { EditorTool, ShapeKind } from "@/types/editor";

type PdfDocumentMap = Record<string, PDFDocumentProxy>;

type PdfViewerProps = {
  activeTool: EditorTool;
  activeShapeKind: ShapeKind;
  onDocumentsReady: (pdfDocuments: PdfDocumentMap) => void;
  onPageRef: (pageId: string, element: HTMLDivElement | null) => void;
  onAnnotationCreated: () => void;
};

export function PdfViewer({
  activeTool,
  activeShapeKind,
  onDocumentsReady,
  onPageRef,
  onAnnotationCreated
}: PdfViewerProps): JSX.Element {
  const { session, setCurrentPage } = useEditorSession();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageElements = useRef<Record<string, HTMLDivElement | null>>({});
  const [pdfDocuments, setPdfDocuments] = useState<PdfDocumentMap>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const documents = useMemo(() => session?.documents ?? [], [session?.documents]);
  const documentSignature = documents.map((document) => document.id).join("|");

  useEffect(() => {
    if (documents.length === 0) {
      return;
    }

    let cancelled = false;
    const loadingTasks = documents.map((document) => {
      configurePdfWorker();
      return {
        documentId: document.id,
        task: getDocument({
          data: new Uint8Array(document.pdfBytes.slice(0))
        })
      };
    });

    setIsLoading(true);
    setError(null);

    Promise.all(
      loadingTasks.map(async ({ documentId, task }) => ({
        documentId,
        pdfDocument: await task.promise
      }))
    )
      .then((loadedDocuments) => {
        if (cancelled) {
          loadedDocuments.forEach(({ pdfDocument }) => {
            void pdfDocument.destroy();
          });
          return;
        }

        const nextDocuments = loadedDocuments.reduce<PdfDocumentMap>(
          (map, item) => ({
            ...map,
            [item.documentId]: item.pdfDocument
          }),
          {}
        );
        setPdfDocuments(nextDocuments);
        onDocumentsReady(nextDocuments);
      })
      .catch(() => {
        if (!cancelled) {
          setError("We could not render one of these PDFs in the browser.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      onDocumentsReady({});
      loadingTasks.forEach(({ task }) => task.destroy());
    };
  }, [documentSignature, documents, onDocumentsReady]);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const pageId = visibleEntry?.target.getAttribute("data-page-id");

        if (pageId) {
          setCurrentPage(pageId);
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
  }, [session?.pageOrder, session?.scale, setCurrentPage]);

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

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
        No PDF loaded.
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto px-4 py-6">
      <div className="mx-auto flex w-max min-w-full flex-col items-center gap-8">
        {session.pageOrder.map((pageRef, index) => {
          const pdfDocument = pdfDocuments[pageRef.sourceDocumentId];

          if (!pdfDocument) {
            return null;
          }

          return (
            <PdfPage
              key={pageRef.id}
              activeTool={activeTool}
              activeShapeKind={activeShapeKind}
              displayPageNumber={index + 1}
              pageRef={pageRef}
              pdfDocument={pdfDocument}
              scale={session.scale}
              onPageRef={(element) => {
                pageElements.current[pageRef.id] = element;
                onPageRef(pageRef.id, element);
              }}
              onAnnotationCreated={onAnnotationCreated}
            />
          );
        })}
      </div>
    </div>
  );
}
