"use client";

import { useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { useEditorSession } from "@/context/EditorSessionContext";
import {
  sanitizeRichTextHtml,
  saveRichTextSelection
} from "@/lib/richText/html";
import type { EditorTool, TextAnnotation } from "@/types/editor";

type TextAnnotationBoxProps = {
  activeTool: EditorTool;
  annotation: TextAnnotation;
};

export function TextAnnotationBox({
  activeTool,
  annotation
}: TextAnnotationBoxProps): JSX.Element {
  const {
    autoFocusAnnotationId,
    clearAutoFocusAnnotation,
    selectedAnnotationId,
    selectAnnotation,
    updateTextAnnotation
  } = useEditorSession();
  const isSelected = selectedAnnotationId === annotation.id;
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (
      editor &&
      document.activeElement !== editor &&
      editor.innerHTML !== annotation.html
    ) {
      editor.innerHTML = annotation.html;
    }
  }, [annotation.html]);

  useEffect(() => {
    const editor = editorRef.current;

    if (autoFocusAnnotationId !== annotation.id || !editor) {
      return;
    }

    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    clearAutoFocusAnnotation();
  }, [annotation.id, autoFocusAnnotationId, clearAutoFocusAnnotation]);

  return (
    <Rnd
      bounds="parent"
      size={{ width: annotation.width, height: annotation.height }}
      position={{ x: annotation.x, y: annotation.y }}
      dragHandleClassName="annotation-drag-handle"
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        selectAnnotation(annotation.id);
      }}
      onMouseDown={() => selectAnnotation(annotation.id)}
      onDragStop={(_, data) => {
        updateTextAnnotation(annotation.id, {
          x: data.x,
          y: data.y
        });
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        updateTextAnnotation(annotation.id, {
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight
        });
      }}
      className="group"
      enableResizing={isSelected}
    >
      <div
        className={[
          "annotation-drag-handle absolute left-1 right-1 top-1 z-10 h-2 rounded-full transition",
          activeTool === "select" || isSelected
            ? "cursor-grab bg-blue-600/70 opacity-70 active:cursor-grabbing group-hover:opacity-100"
            : "cursor-default bg-transparent opacity-0"
        ].join(" ")}
        aria-hidden="true"
      />
      <div
        className={[
          "h-full w-full overflow-auto rounded-md p-2 pt-4 shadow-sm outline-none transition",
          "hover:border-blue-600/65",
          isSelected
            ? "border-2 border-blue-600"
            : "border border-dashed border-blue-600/35"
        ].join(" ")}
        style={{
          backgroundColor: annotation.backgroundTransparent
            ? "transparent"
            : annotation.backgroundColor
        }}
      >
        <div
          ref={editorRef}
          id={`rich-text-editor-${annotation.id}`}
          className="rich-text-editor h-full w-full cursor-text whitespace-pre-wrap break-words outline-none"
          contentEditable
          data-placeholder="Type here"
          suppressContentEditableWarning
          style={{
            fontFamily: annotation.defaultFontFamily,
            fontSize: annotation.defaultFontSize,
            color: annotation.defaultColor,
            fontWeight: annotation.bold ? 700 : 400,
            fontStyle: annotation.italic ? "italic" : "normal"
          }}
          onClick={(event) => {
            event.stopPropagation();
            selectAnnotation(annotation.id);
            saveRichTextSelection(annotation.id);
          }}
          onMouseUp={() => saveRichTextSelection(annotation.id)}
          onKeyUp={() => saveRichTextSelection(annotation.id)}
          onBlur={() => saveRichTextSelection(annotation.id)}
          onInput={(event) => {
            const html = sanitizeRichTextHtml(event.currentTarget.innerHTML);
            const plainText = event.currentTarget.innerText.trim()
              ? event.currentTarget.innerText
              : "";
            if (!plainText) {
              event.currentTarget.innerHTML = "";
            }
            updateTextAnnotation(annotation.id, {
              html: plainText ? html : "",
              plainText,
              text: plainText
            });
          }}
        />
      </div>
    </Rnd>
  );
}
