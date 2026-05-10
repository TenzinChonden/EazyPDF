"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, Printer } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { EditorToolbar } from "@/components/EditorToolbar";
import { PageThumbnailSidebar } from "@/components/PageThumbnailSidebar";
import { PdfViewer } from "@/components/PdfViewer";
import { useEditorSession } from "@/context/EditorSessionContext";
import {
  downloadBlob,
  generateEditedPdfBlob,
  printBlob
} from "@/lib/pdf/exportPdf";
import {
  exportAllPagesAsImagesZip,
  exportCurrentPageAsImage,
  type ImageExportFormat
} from "@/lib/pdf/imageExport";
import { formatFileSize } from "@/lib/utils/formatFileSize";
import type { EditorTool, ShapeKind } from "@/types/editor";

type PdfDocumentMap = Record<string, PDFDocumentProxy>;

export default function EditorPage(): JSX.Element {
  const router = useRouter();
  const { session, addSourceDocument, reorderPages, setCurrentPage } =
    useEditorSession();
  const [tool, setTool] = useState<EditorTool>("select");
  const [activeShapeKind, setActiveShapeKind] = useState<ShapeKind>("check");
  const [pdfDocuments, setPdfDocuments] = useState<PdfDocumentMap>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!session) {
      router.replace("/");
    }
  }, [router, session]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-sm text-slate-500">
        Returning to upload...
      </main>
    );
  }

  const totalFileSize = session.documents.reduce(
    (total, document) => total + document.fileSize,
    0
  );

  const handleDownload = async () => {
    setIsGeneratingPdf(true);
    setIsDownloadMenuOpen(false);
    setExportProgress(null);
    setExportError(null);

    try {
      const blob = await generateEditedPdfBlob(session);
      downloadBlob(blob, session.documents[0]?.fileName ?? "combined.pdf");
    } catch {
      setExportError("Export failed. Try again after the PDF finishes rendering.");
    } finally {
      setIsGeneratingPdf(false);
      setExportProgress(null);
    }
  };

  const handlePrint = async () => {
    setIsGeneratingPdf(true);
    setIsDownloadMenuOpen(false);
    setExportProgress(null);
    setExportError(null);

    try {
      const blob = await generateEditedPdfBlob(session);
      printBlob(blob);
    } catch {
      setExportError("Print failed. Try again after the PDF finishes rendering.");
    } finally {
      setIsGeneratingPdf(false);
      setExportProgress(null);
    }
  };

  const handleCurrentPageImageExport = async (format: ImageExportFormat) => {
    setIsGeneratingPdf(true);
    setIsDownloadMenuOpen(false);
    setExportProgress("Rendering current page...");
    setExportError(null);

    try {
      await exportCurrentPageAsImage(session, format);
    } catch {
      setExportError("Image export failed. Try again after the PDF finishes rendering.");
    } finally {
      setIsGeneratingPdf(false);
      setExportProgress(null);
    }
  };

  const handleAllPagesImageExport = async (format: ImageExportFormat) => {
    if (
      session.pageOrder.length > 25 &&
      !window.confirm(
        `Export ${session.pageOrder.length} pages as images? This may take a while.`
      )
    ) {
      return;
    }

    setIsGeneratingPdf(true);
    setIsDownloadMenuOpen(false);
    setExportError(null);

    try {
      await exportAllPagesAsImagesZip(session, format, (currentPage, totalPages) => {
        setExportProgress(`Exporting page ${currentPage} of ${totalPages}...`);
      });
    } catch {
      setExportError("ZIP image export failed. Try again with a smaller document.");
    } finally {
      setIsGeneratingPdf(false);
      setExportProgress(null);
    }
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-bold text-white">
            EP
          </div>
          <div className="min-w-0">
            <div className="font-bold leading-5">EazyPDF</div>
            <div className="truncate text-xs text-slate-500">
              {session.documents.length}{" "}
              {session.documents.length === 1 ? "PDF" : "PDFs"} ·{" "}
              {formatFileSize(totalFileSize)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            type="button"
            disabled={isGeneratingPdf}
            onClick={handlePrint}
          >
            <Printer aria-hidden="true" size={17} />
            {isGeneratingPdf ? "Preparing..." : "Print"}
          </button>
          <div className="relative">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => setIsDownloadMenuOpen((current) => !current)}
            >
              <Download aria-hidden="true" size={17} />
              {isGeneratingPdf ? "Preparing..." : "Download"}
              <ChevronDown aria-hidden="true" size={16} />
            </button>
            {isDownloadMenuOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                <DownloadMenuItem onClick={handleDownload}>
                  Download as PDF
                </DownloadMenuItem>
                <DownloadMenuItem
                  onClick={() => void handleCurrentPageImageExport("png")}
                >
                  Download current page as PNG
                </DownloadMenuItem>
                <DownloadMenuItem
                  onClick={() => void handleCurrentPageImageExport("jpeg")}
                >
                  Download current page as JPEG
                </DownloadMenuItem>
                <DownloadMenuItem
                  onClick={() => void handleAllPagesImageExport("png")}
                >
                  Download all pages as PNG ZIP
                </DownloadMenuItem>
                <DownloadMenuItem
                  onClick={() => void handleAllPagesImageExport("jpeg")}
                >
                  Download all pages as JPEG ZIP
                </DownloadMenuItem>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <PageThumbnailSidebar
          currentPageId={session.currentPageId}
          pageOrder={session.pageOrder}
          pdfDocuments={pdfDocuments}
          onAddDocument={addSourceDocument}
          onSelectPage={(pageId) => {
            setCurrentPage(pageId);
            pageRefs.current[pageId]?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }}
          onReorderPages={reorderPages}
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          <EditorToolbar
            activeTool={tool}
            onToolChange={setTool}
            onShapeSelect={(kind) => {
              setActiveShapeKind(kind);
              setTool("shape");
            }}
          />
          {exportError ? (
            <div className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {exportError}
            </div>
          ) : null}
          {exportProgress ? (
            <div className="mx-4 mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 ring-1 ring-teal-100">
              {exportProgress}
            </div>
          ) : null}
          <PdfViewer
            activeTool={tool}
            activeShapeKind={activeShapeKind}
            onDocumentsReady={setPdfDocuments}
            onPageRef={(pageId, element) => {
              pageRefs.current[pageId] = element;
            }}
            onAnnotationCreated={() => setTool("select")}
          />
        </section>
      </div>
    </main>
  );
}

function DownloadMenuItem({
  children,
  onClick
}: {
  children: React.ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
