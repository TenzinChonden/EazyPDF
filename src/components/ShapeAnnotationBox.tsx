"use client";

import { Rnd } from "react-rnd";
import { useEditorSession } from "@/context/EditorSessionContext";
import type { ShapeAnnotation } from "@/types/editor";

type ShapeAnnotationBoxProps = {
  annotation: ShapeAnnotation;
};

export function ShapeAnnotationBox({
  annotation
}: ShapeAnnotationBoxProps): JSX.Element {
  const { selectedAnnotationId, selectAnnotation, updateShapeAnnotation } =
    useEditorSession();
  const isSelected = selectedAnnotationId === annotation.id;

  return (
    <Rnd
      bounds="parent"
      size={{ width: annotation.width, height: annotation.height }}
      position={{ x: annotation.x, y: annotation.y }}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        selectAnnotation(annotation.id);
      }}
      onMouseDown={() => selectAnnotation(annotation.id)}
      onDragStop={(_, data) => {
        updateShapeAnnotation(annotation.id, {
          x: data.x,
          y: data.y
        });
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        updateShapeAnnotation(annotation.id, {
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight
        });
      }}
      enableResizing={isSelected}
      className="cursor-grab active:cursor-grabbing"
    >
      <div
        className={[
          "h-full w-full rounded-md transition hover:outline hover:outline-1 hover:outline-blue-500/70",
          isSelected ? "outline outline-2 outline-offset-2 outline-blue-600" : ""
        ].join(" ")}
      >
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          aria-hidden="true"
          style={{ opacity: annotation.opacity }}
        >
          {annotation.kind === "check" ? (
            <polyline
              points="18,55 40,76 84,24"
              fill="none"
              stroke={annotation.strokeColor}
              strokeWidth={annotation.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {annotation.kind === "cross" ? (
            <>
              <line
                x1="22"
                y1="22"
                x2="78"
                y2="78"
                stroke={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
                strokeLinecap="round"
              />
              <line
                x1="78"
                y1="22"
                x2="22"
                y2="78"
                stroke={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
                strokeLinecap="round"
              />
            </>
          ) : null}
          {annotation.kind === "circle" ? (
            <ellipse
              cx="50"
              cy="50"
              rx="38"
              ry="38"
              fill="none"
              stroke={annotation.strokeColor}
              strokeWidth={annotation.strokeWidth}
            />
          ) : null}
        </svg>
      </div>
    </Rnd>
  );
}
