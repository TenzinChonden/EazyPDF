"use client";

import {
  Bold,
  Italic,
  MousePointer2,
  RotateCcw,
  RotateCw,
  FileX,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useEditorSession } from "@/context/EditorSessionContext";
import { applyInlineStyleToSelection } from "@/lib/richText/html";
import type {
  EditorTool,
  TextBackgroundColor,
  TextFontFamily
} from "@/types/editor";

type EditorToolbarProps = {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
};

const FONT_OPTIONS: TextFontFamily[] = [
  "Helvetica",
  "Times Roman",
  "Courier",
  "Arial",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Garamond",
  "Monospace"
];

const TEXT_COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Gray", value: "#6B7280" },
  { name: "Red", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Green", value: "#22C55E" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "White", value: "#FFFFFF" }
];

const BACKGROUND_COLORS: Array<{
  name: string;
  value: TextBackgroundColor;
  swatch: string;
}> = [
  { name: "Transparent", value: "transparent", swatch: "transparent" },
  { name: "White", value: "#FFFFFF", swatch: "#FFFFFF" },
  { name: "Yellow", value: "#FEF3C7", swatch: "#FEF3C7" },
  { name: "Gray", value: "#F3F4F6", swatch: "#F3F4F6" }
];

export function EditorToolbar({
  activeTool,
  onToolChange
}: EditorToolbarProps): JSX.Element {
  const {
    session,
    selectedAnnotationId,
    selectedPageIds,
    updateTextAnnotation,
    deleteTextAnnotation,
    deletePages,
    rotatePages,
    setScale
  } = useEditorSession();
  const scale = session?.scale ?? 1.25;
  const selectedAnnotation = session?.annotations.find(
    (annotation) => annotation.id === selectedAnnotationId
  );
  const pageDeleteCount = selectedPageIds.length;
  const deletePageLabel = pageDeleteCount > 0 ? "Delete Selected" : "Delete Page";
  const applyInlineStyle = (
    patch: Parameters<typeof applyInlineStyleToSelection>[1]
  ) => {
    if (!selectedAnnotation) {
      return;
    }

    updateTextAnnotation(
      selectedAnnotation.id,
      applyInlineStyleToSelection(selectedAnnotation, patch)
    );
  };

  return (
    <div className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
      <button
        className={toolButtonClass(activeTool === "select")}
        type="button"
        title="Select"
        aria-pressed={activeTool === "select"}
        onClick={() => onToolChange("select")}
      >
        <MousePointer2 aria-hidden="true" size={17} />
        <span>Select</span>
      </button>
      <button
        className={toolButtonClass(activeTool === "text")}
        type="button"
        title="Text"
        aria-pressed={activeTool === "text"}
        onClick={() => onToolChange("text")}
      >
        <Type aria-hidden="true" size={17} />
        <span>Text</span>
      </button>
      <div className="mx-2 h-6 w-px bg-slate-200" />
      <button
        className={iconButtonClass}
        type="button"
        title="Zoom out"
        onClick={() => setScale(scale - 0.25)}
      >
        <ZoomOut aria-hidden="true" size={18} />
      </button>
      <span className="w-14 text-center text-sm font-medium text-slate-600">
        {Math.round(scale * 100)}%
      </span>
      <button
        className={iconButtonClass}
        type="button"
        title="Zoom in"
        onClick={() => setScale(scale + 0.25)}
      >
        <ZoomIn aria-hidden="true" size={18} />
      </button>
      <div className="mx-2 h-6 w-px bg-slate-200" />
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        type="button"
        title="Rotate Left"
        onClick={() => rotatePages("left")}
      >
        <RotateCcw aria-hidden="true" size={17} />
        <span>Rotate Left</span>
      </button>
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        type="button"
        title="Rotate Right"
        onClick={() => rotatePages("right")}
      >
        <RotateCw aria-hidden="true" size={17} />
        <span>Rotate Right</span>
      </button>
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        type="button"
        title={deletePageLabel}
        onClick={() => {
          const pageIds =
            selectedPageIds.length > 0
              ? selectedPageIds
              : session?.currentPageId
                ? [session.currentPageId]
                : [];

          if (pageIds.length === 0) {
            return;
          }

          const confirmed = window.confirm(
            `Delete ${pageIds.length === 1 ? "this page" : `${pageIds.length} pages`}?`
          );

          if (!confirmed) {
            return;
          }

          const error = deletePages(pageIds);
          if (error) {
            window.alert(error);
          }
        }}
      >
        <FileX aria-hidden="true" size={17} />
        <span>{deletePageLabel}</span>
      </button>
      {selectedAnnotation ? (
        <>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <select
            className={`${fieldClass} max-w-36`}
            aria-label="Font family"
            value={selectedAnnotation.defaultFontFamily}
            onChange={(event) =>
              applyInlineStyle({
                fontFamily: event.target.value as TextFontFamily
              })
            }
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>
          <input
            className="h-9 w-16 rounded-md border border-slate-300 px-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            aria-label="Font size"
            type="number"
            min={8}
            max={96}
            value={Math.round(selectedAnnotation.defaultFontSize)}
            onChange={(event) =>
              applyInlineStyle({
                fontSize: Number(event.target.value) || 16
              })
            }
          />
          <button
            className={toolButtonClass(selectedAnnotation.bold)}
            type="button"
            title="Bold"
            aria-pressed={selectedAnnotation.bold}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              applyInlineStyle({
                bold: !selectedAnnotation.bold
              })
            }
          >
            <Bold aria-hidden="true" size={17} />
          </button>
          <button
            className={toolButtonClass(selectedAnnotation.italic)}
            type="button"
            title="Italic"
            aria-pressed={selectedAnnotation.italic}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              applyInlineStyle({
                italic: !selectedAnnotation.italic
              })
            }
          >
            <Italic aria-hidden="true" size={17} />
          </button>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1">
            <span className="text-xs font-semibold text-slate-500">Text</span>
            {TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                className={[
                  "h-5 w-5 rounded-full border transition",
                  selectedAnnotation.defaultColor.toUpperCase() === color.value
                    ? "border-slate-950 ring-2 ring-slate-300"
                    : "border-slate-300 hover:scale-110"
                ].join(" ")}
                style={{ backgroundColor: color.value }}
                type="button"
                title={color.name}
                aria-label={`${color.name} text`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyInlineStyle({ color: color.value })}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1">
            <span className="text-xs font-semibold text-slate-500">Bg</span>
            {BACKGROUND_COLORS.map((color) => (
              <button
                key={color.value}
                className={[
                  "h-5 w-5 rounded border transition",
                  selectedAnnotation.backgroundColor === color.value
                    ? "border-slate-950 ring-2 ring-slate-300"
                    : "border-slate-300 hover:scale-110",
                  color.value === "transparent"
                    ? "bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)] bg-[length:8px_8px] bg-[position:0_0,0_4px,4px_-4px,-4px_0px]"
                    : ""
                ].join(" ")}
                style={{
                  backgroundColor:
                    color.value === "transparent" ? undefined : color.swatch
                }}
                type="button"
                title={`${color.name} background`}
                aria-label={`${color.name} background`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  updateTextAnnotation(selectedAnnotation.id, {
                    backgroundColor: color.value,
                    backgroundTransparent: color.value === "transparent"
                  })
                }
              />
            ))}
          </div>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            type="button"
            title="Delete text box"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => deleteTextAnnotation(selectedAnnotation.id)}
          >
            <Trash2 aria-hidden="true" size={17} />
            <span>Delete</span>
          </button>
        </>
      ) : null}
      <span className="ml-auto hidden text-sm font-medium text-slate-500 sm:inline">
        Your PDF stays in your browser.
      </span>
    </div>
  );
}

function toolButtonClass(isActive: boolean): string {
  return [
    "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition",
    isActive
      ? "bg-slate-950 text-white"
      : "bg-white text-slate-700 hover:bg-slate-100"
  ].join(" ");
}

const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100";

const fieldClass =
  "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
