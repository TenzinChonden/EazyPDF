"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type {
  EditorSession,
  PageViewportSize,
  TextAnnotation
} from "@/types/editor";

type CreateSessionInput = {
  fileName: string;
  fileSize: number;
  pdfBytes: ArrayBuffer;
};

type EditorSessionContextValue = {
  session: EditorSession | null;
  selectedAnnotationId: string | null;
  autoFocusAnnotationId: string | null;
  createSession: (input: CreateSessionInput) => void;
  clearSession: () => void;
  addTextAnnotation: (
    annotation: Omit<
      TextAnnotation,
      | "id"
      | "type"
      | "html"
      | "plainText"
      | "text"
      | "defaultFontFamily"
      | "defaultFontSize"
      | "defaultColor"
      | "backgroundColor"
      | "backgroundTransparent"
      | "bold"
      | "italic"
    >
  ) => string;
  updateTextAnnotation: (id: string, patch: Partial<TextAnnotation>) => void;
  deleteTextAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  clearAutoFocusAnnotation: () => void;
  initializePageOrder: (pageCount: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  setScale: (scale: number) => void;
  setCurrentPage: (pageNumber: number) => void;
  setPageViewport: (pageNumber: number, size: PageViewportSize) => void;
};

const EditorSessionContext = createContext<EditorSessionContextValue | null>(
  null
);

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function EditorSessionProvider({
  children
}: {
  children: ReactNode;
}): JSX.Element {
  const [session, setSession] = useState<EditorSession | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null
  );
  const [autoFocusAnnotationId, setAutoFocusAnnotationId] = useState<
    string | null
  >(null);

  const touch = useCallback(
    (updater: (current: EditorSession) => EditorSession) => {
      setSession((current) => {
        if (!current) {
          return current;
        }

        return {
          ...updater(current),
          updatedAt: Date.now()
        };
      });
    },
    []
  );

  const createSession = useCallback((input: CreateSessionInput) => {
    const now = Date.now();
    setSession({
      sessionId: createId(),
      fileName: input.fileName,
      fileSize: input.fileSize,
      pdfBytes: input.pdfBytes,
      annotations: [],
      currentPage: 1,
      pageOrder: [],
      scale: 1.25,
      pageViewports: {},
      createdAt: now,
      updatedAt: now
    });
    setSelectedAnnotationId(null);
    setAutoFocusAnnotationId(null);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setSelectedAnnotationId(null);
    setAutoFocusAnnotationId(null);
  }, []);

  const addTextAnnotation: EditorSessionContextValue["addTextAnnotation"] =
    useCallback(
      (annotation) => {
        const id = createId();
        touch((current) => ({
          ...current,
          annotations: [
            ...current.annotations,
            {
              ...annotation,
              id,
              type: "text",
              html: "",
              plainText: "",
              text: "",
              defaultFontFamily: "Helvetica",
              defaultFontSize: 16,
              defaultColor: "#111827",
              backgroundColor: "transparent",
              backgroundTransparent: true,
              bold: false,
              italic: false
            }
          ]
        }));
        setSelectedAnnotationId(id);
        setAutoFocusAnnotationId(id);
        return id;
      },
      [touch]
    );

  const updateTextAnnotation = useCallback(
    (id: string, patch: Partial<TextAnnotation>) => {
      touch((current) => ({
        ...current,
        annotations: current.annotations.map((annotation) =>
          annotation.id === id ? { ...annotation, ...patch } : annotation
        )
      }));
    },
    [touch]
  );

  const deleteTextAnnotation = useCallback(
    (id: string) => {
      touch((current) => ({
        ...current,
        annotations: current.annotations.filter(
          (annotation) => annotation.id !== id
        )
      }));
      setSelectedAnnotationId((current) => (current === id ? null : current));
    },
    [touch]
  );

  const selectAnnotation = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const clearAutoFocusAnnotation = useCallback(() => {
    setAutoFocusAnnotationId(null);
  }, []);

  const initializePageOrder = useCallback(
    (pageCount: number) => {
      touch((current) => {
        if (current.pageOrder.length === pageCount) {
          return current;
        }

        return {
          ...current,
          pageOrder: Array.from({ length: pageCount }, (_, index) => index + 1)
        };
      });
    },
    [touch]
  );

  const reorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      touch((current) => {
        const pageOrder = [...current.pageOrder];
        const [movedPage] = pageOrder.splice(fromIndex, 1);

        if (!movedPage) {
          return current;
        }

        pageOrder.splice(toIndex, 0, movedPage);

        return {
          ...current,
          pageOrder,
          currentPage: movedPage
        };
      });
    },
    [touch]
  );

  const setScale = useCallback(
    (nextScale: number) => {
      touch((current) => {
        const clampedScale = Math.min(2.5, Math.max(0.5, nextScale));
        const ratio = clampedScale / current.scale;

        return {
          ...current,
          scale: clampedScale,
          annotations: current.annotations.map((annotation) => ({
            ...annotation,
            x: annotation.x * ratio,
            y: annotation.y * ratio,
            width: annotation.width * ratio,
            height: annotation.height * ratio,
            defaultFontSize: annotation.defaultFontSize * ratio
          }))
        };
      });
    },
    [touch]
  );

  const setCurrentPage = useCallback(
    (pageNumber: number) => {
      touch((current) => ({
        ...current,
        currentPage: pageNumber
      }));
    },
    [touch]
  );

  const setPageViewport = useCallback(
    (pageNumber: number, size: PageViewportSize) => {
      touch((current) => ({
        ...current,
        pageViewports: {
          ...current.pageViewports,
          [pageNumber]: size
        }
      }));
    },
    [touch]
  );

  const value = useMemo(
    () => ({
      session,
      selectedAnnotationId,
      autoFocusAnnotationId,
      createSession,
      clearSession,
      addTextAnnotation,
      updateTextAnnotation,
      deleteTextAnnotation,
      selectAnnotation,
      clearAutoFocusAnnotation,
      initializePageOrder,
      reorderPages,
      setScale,
      setCurrentPage,
      setPageViewport
    }),
    [
      session,
      selectedAnnotationId,
      autoFocusAnnotationId,
      createSession,
      clearSession,
      addTextAnnotation,
      updateTextAnnotation,
      deleteTextAnnotation,
      selectAnnotation,
      clearAutoFocusAnnotation,
      initializePageOrder,
      reorderPages,
      setScale,
      setCurrentPage,
      setPageViewport
    ]
  );

  return (
    <EditorSessionContext.Provider value={value}>
      {children}
    </EditorSessionContext.Provider>
  );
}

export function useEditorSession(): EditorSessionContextValue {
  const context = useContext(EditorSessionContext);

  if (!context) {
    throw new Error("useEditorSession must be used inside EditorSessionProvider");
  }

  return context;
}
