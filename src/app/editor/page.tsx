"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { EditorToolbar } from "@/components/EditorToolbar";
import { PageThumbnailSidebar } from "@/components/PageThumbnailSidebar";
import { PdfViewer } from "@/components/PdfViewer";
import { useEditorSession } from "@/context/EditorSessionContext";
import { downloadBlob, exportEditedPdf } from "@/lib/pdf/exportPdf";
import { formatFileSize } from "@/lib/utils/formatFileSize";
import type { EditorTool } from "@/types/editor";
import type { PDFDocumentProxy } from "pdfjs-dist";

export default function EditorPage(): JSX.Element {
  const router = useRouter();
  const { session, reorderPages, setCurrentPage } = useEditorSession();
  const [tool, setTool] = useState<EditorTool>("select");
  const [pageCount, setPageCount] = useState(0);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

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

  const handleDownload = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await exportEditedPdf(session);
      downloadBlob(blob, session.fileName);
    } catch {
      setExportError("Export failed. Try again after the PDF finishes rendering.");
    } finally {
      setIsExporting(false);
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
              {session.fileName} · {formatFileSize(session.fileSize)}
            </div>
          </div>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={isExporting}
          onClick={handleDownload}
        >
          <Download aria-hidden="true" size={17} />
          {isExporting ? "Exporting..." : "Download"}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <PageThumbnailSidebar
          currentPage={session.currentPage}
          pageCount={pageCount}
          pageOrder={session.pageOrder}
          pdfDocument={pdfDocument}
          onSelectPage={(pageNumber) => {
            setCurrentPage(pageNumber);
            pageRefs.current[pageNumber]?.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }}
          onReorderPages={reorderPages}
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          <EditorToolbar activeTool={tool} onToolChange={setTool} />
          {exportError ? (
            <div className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {exportError}
            </div>
          ) : null}
          <PdfViewer
            activeTool={tool}
            onDocumentLoaded={setPageCount}
            onDocumentReady={setPdfDocument}
            onPageRef={(pageNumber, element) => {
              pageRefs.current[pageNumber] = element;
            }}
            onTextCreated={() => setTool("select")}
          />
        </section>
      </div>
    </main>
  );
}
