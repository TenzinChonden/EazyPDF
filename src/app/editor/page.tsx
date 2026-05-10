"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { EditorToolbar } from "@/components/EditorToolbar";
import {
  ExportOptionsModal,
  type ExportFormat,
  type ExportPageMode
} from "@/components/ExportOptionsModal";
import { PageThumbnailSidebar } from "@/components/PageThumbnailSidebar";
import { PdfViewer } from "@/components/PdfViewer";
import { useEditorSession } from "@/context/EditorSessionContext";
import {
  downloadBlob,
  generateEditedPdfBlob,
  printBlob
} from "@/lib/pdf/exportPdf";
import {
  exportPagesAsImages
} from "@/lib/pdf/imageExport";
import { formatFileSize } from "@/lib/utils/formatFileSize";
import type { EditorSession, EditorTool } from "@/types/editor";

type PdfDocumentMap = Record<string, PDFDocumentProxy>;

export default function EditorPage(): JSX.Element {
  const router = useRouter();
  const {
    session,
    addSourceDocument,
    reorderPages,
    selectedPageIds,
    setCurrentPage
  } = useEditorSession();
  const [tool, setTool] = useState<EditorTool>("select");
  const [pdfDocuments, setPdfDocuments] = useState<PdfDocumentMap>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exportPageMode, setExportPageMode] =
    useState<ExportPageMode>("all");
  const [exportName, setExportName] = useState("eazypdf-export");
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
  const defaultExportName = getDefaultExportName(session.documents[0]?.fileName);

  const openExportModal = (format: ExportFormat) => {
    setExportFormat(format);
    setExportPageMode("all");
    setExportName(defaultExportName);
    setExportError(null);
    setExportProgress(null);
  };

  const handleExport = async () => {
    if (!exportFormat) {
      return;
    }

    const cleanName = sanitizeFileName(exportName) || "eazypdf-export";
    const pageIds = getExportPageIds(session, exportPageMode, selectedPageIds);
    setIsGeneratingPdf(true);
    setExportProgress(null);
    setExportError(null);

    try {
      if (exportFormat === "pdf") {
        const blob = await generateEditedPdfBlob(session, { pageIds });
        downloadBlob(blob, `${cleanName}.pdf`);
      } else {
        await exportPagesAsImages(
          session,
          exportFormat,
          pageIds,
          cleanName,
          (currentPage, totalPages) => {
            setExportProgress(`Exporting page ${currentPage} of ${totalPages}...`);
          }
        );
      }
      setExportFormat(null);
    } catch {
      setExportError("Export failed. Try again after the PDF finishes rendering.");
    } finally {
      setIsGeneratingPdf(false);
      setExportProgress(null);
    }
  };

  const handlePrint = async () => {
    setIsGeneratingPdf(true);
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
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={isGeneratingPdf}
            onClick={() => openExportModal("pdf")}
          >
            <Download aria-hidden="true" size={17} />
            {isGeneratingPdf ? "Preparing..." : "Download"}
          </button>
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
              setTool(`shape-${kind}`);
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
            onDocumentsReady={setPdfDocuments}
            onPageRef={(pageId, element) => {
              pageRefs.current[pageId] = element;
            }}
            onAnnotationCreated={() => setTool("select")}
          />
        </section>
      </div>
      {exportFormat ? (
        <ExportOptionsModal
          format={exportFormat}
          session={session}
          selectedPageIds={selectedPageIds}
          exportName={exportName}
          isExporting={isGeneratingPdf}
          progress={exportProgress}
          error={exportError}
          pageMode={exportPageMode}
          onExportNameChange={setExportName}
          onFormatChange={setExportFormat}
          onPageModeChange={setExportPageMode}
          onCancel={() => {
            setExportFormat(null);
            setExportError(null);
            setExportProgress(null);
          }}
          onExport={handleExport}
        />
      ) : null}
    </main>
  );
}

function getExportPageIds(
  session: EditorSession,
  mode: ExportPageMode,
  selectedPageIds: string[]
): string[] {
  if (mode === "current") {
    const fallbackPageId = session.pageOrder[0]?.id;
    return session.currentPageId
      ? [session.currentPageId]
      : fallbackPageId
        ? [fallbackPageId]
        : [];
  }

  if (mode === "selected") {
    const selectedSet = new Set(selectedPageIds);
    return session.pageOrder
      .filter((page) => selectedSet.has(page.id))
      .map((page) => page.id);
  }

  return session.pageOrder.map((page) => page.id);
}

function getDefaultExportName(fileName?: string): string {
  if (!fileName) {
    return "eazypdf-export";
  }

  return `edited-${fileName.replace(/\.[^/.]+$/, "")}`;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+$/, "");
}
