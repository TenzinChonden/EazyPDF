"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { ShapeAnnotationBox } from "@/components/ShapeAnnotationBox";
import { TextAnnotationBox } from "@/components/TextAnnotationBox";
import { useEditorSession } from "@/context/EditorSessionContext";
import type {
  EditorTool,
  PageRef,
  PageViewportSize,
  ShapeKind,
  SourceDocument
} from "@/types/editor";

type PdfPageProps = {
  activeTool: EditorTool;
  displayPageNumber: number;
  pageRef: PageRef;
  sourceDocument: SourceDocument;
  pdfDocument?: PDFDocumentProxy;
  scale: number;
  onPageRef: (element: HTMLDivElement | null) => void;
  onAnnotationCreated: () => void;
};

export function PdfPage({
  activeTool,
  displayPageNumber,
  pageRef,
  sourceDocument,
  pdfDocument,
  scale,
  onPageRef,
  onAnnotationCreated
}: PdfPageProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    session,
    addShapeAnnotation,
    addTextAnnotation,
    selectAnnotation,
    setPageViewport,
    setCurrentPage
  } = useEditorSession();
  const [pageSize, setPageSize] = useState<PageViewportSize | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;

    async function renderPage() {
      setIsRendering(true);

      if (sourceDocument.type === "image") {
        const width = 612 * scale;
        const height = (612 * sourceDocument.height * scale) / sourceDocument.width;
        setPageSize({ width, height });
        setPageViewport(pageRef.id, { width, height });
        setIsRendering(false);
        return;
      }

      if (!pdfDocument) {
        return;
      }

      const page = await pdfDocument.getPage(pageRef.sourcePageIndex + 1);
      const viewport = page.getViewport({
        scale,
        rotation: pageRef.rotation
      });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");

      if (!canvas || !context || cancelled) {
        return;
      }

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;

      if (!cancelled) {
        const size = { width: viewport.width, height: viewport.height };
        setPageSize(size);
        setPageViewport(pageRef.id, size);
        setIsRendering(false);
      }
    }

    renderPage().catch(() => {
      if (!cancelled) {
        setIsRendering(false);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [
    pageRef.id,
    pageRef.rotation,
    pageRef.sourcePageIndex,
    pdfDocument,
    scale,
    setPageViewport,
    sourceDocument
  ]);

  const pageAnnotations =
    session?.annotations.filter((annotation) => annotation.pageId === pageRef.id) ??
    [];

  return (
    <div
      ref={onPageRef}
      id={`pdf-page-${pageRef.id}`}
      data-page-id={pageRef.id}
      className="w-full scroll-mt-4"
    >
      <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        Page {displayPageNumber}
      </div>
      <div
        ref={pageContainerRef}
        className="relative mx-auto bg-white shadow-lg shadow-slate-300/70 ring-1 ring-slate-200"
        style={{
          width: pageSize?.width,
          height: pageSize?.height
        }}
        onClick={(event) => {
          if (activeTool === "select") {
            selectAnnotation(null);
            return;
          }

          if (!pageContainerRef.current || !pageSize) {
            return;
          }

          const rect = pageContainerRef.current.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;

          if (activeTool === "text") {
            addTextAnnotation({
              pageId: pageRef.id,
              x,
              y,
              width: 160,
              height: 48
            });
          } else if (isShapeTool(activeTool)) {
            addShapeAnnotation({
              pageId: pageRef.id,
              kind: getShapeKindFromTool(activeTool),
              x,
              y
            });
          }

          setCurrentPage(pageRef.id);
          onAnnotationCreated();
        }}
      >
        {sourceDocument.type === "image" ? (
          <img
            className="block h-full w-full object-contain"
            alt={sourceDocument.fileName}
            src={createImageDataUrl(sourceDocument)}
          />
        ) : (
          <canvas ref={canvasRef} className="block" />
        )}
        {isRendering ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-medium text-slate-500">
            Rendering page...
          </div>
        ) : null}
        {pageAnnotations.map((annotation) =>
          annotation.type === "text" ? (
            <TextAnnotationBox
              key={annotation.id}
              activeTool={activeTool}
              annotation={annotation}
            />
          ) : (
            <ShapeAnnotationBox key={annotation.id} annotation={annotation} />
          )
        )}
      </div>
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

function isShapeTool(tool: EditorTool): boolean {
  return tool.startsWith("shape-");
}

function getShapeKindFromTool(tool: EditorTool): ShapeKind {
  if (tool === "shape-cross") {
    return "cross";
  }

  if (tool === "shape-circle") {
    return "circle";
  }

  return "check";
}
