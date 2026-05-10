"use client";

import type { EditorSession } from "@/types/editor";

export type ExportFormat = "pdf" | "png" | "jpeg";
export type ExportPageMode = "all" | "current" | "selected";

type ExportOptionsModalProps = {
  format: ExportFormat;
  session: EditorSession;
  selectedPageIds: string[];
  exportName: string;
  isExporting: boolean;
  progress: string | null;
  error: string | null;
  onExportNameChange: (name: string) => void;
  onFormatChange: (format: ExportFormat) => void;
  pageMode: ExportPageMode;
  onPageModeChange: (mode: ExportPageMode) => void;
  onCancel: () => void;
  onExport: () => void;
};

export function ExportOptionsModal({
  format,
  session,
  selectedPageIds,
  exportName,
  isExporting,
  progress,
  error,
  onExportNameChange,
  onFormatChange,
  pageMode,
  onPageModeChange,
  onCancel,
  onExport
}: ExportOptionsModalProps): JSX.Element {
  const selectedCount = selectedPageIds.length;
  const currentPageNumber =
    session.pageOrder.findIndex((page) => page.id === session.currentPageId) + 1;
  const canExport = Boolean(exportName.trim()) && !(pageMode === "selected" && selectedCount === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">Export Options</h2>
          <p className="mt-1 text-sm text-slate-500">
            Multiple image pages will be downloaded as a ZIP.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Export format
            </span>
            <select
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              value={format}
              disabled={isExporting}
              onChange={(event) => onFormatChange(event.target.value as ExportFormat)}
            >
              <option value="pdf">PDF</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select>
          </label>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">
              Pages
            </legend>
            <div className="mt-2 space-y-2">
              <RadioOption
                checked={pageMode === "all"}
                disabled={isExporting}
                label={`All pages (${session.pageOrder.length})`}
                onChange={() => onPageModeChange("all")}
              />
              <RadioOption
                checked={pageMode === "current"}
                disabled={isExporting}
                label={`Current page (${currentPageNumber || 1})`}
                onChange={() => onPageModeChange("current")}
              />
              <RadioOption
                checked={pageMode === "selected"}
                disabled={isExporting || selectedCount === 0}
                label={
                  selectedCount > 0
                    ? `Selected pages (${selectedCount})`
                    : "Selected pages (none selected)"
                }
                onChange={() => onPageModeChange("selected")}
              />
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Export name
            </span>
            <input
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              value={exportName}
              disabled={isExporting}
              onChange={(event) => onExportNameChange(event.target.value)}
            />
          </label>

          {progress ? (
            <div className="rounded-md bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
              {progress}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            type="button"
            disabled={isExporting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={isExporting || !canExport}
            onClick={onExport}
          >
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RadioOption({
  checked,
  disabled,
  label,
  onChange
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: () => void;
}): JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        className="accent-teal-600"
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {label}
    </label>
  );
}
