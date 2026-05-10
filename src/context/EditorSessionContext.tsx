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
  PageRef,
  PageRotation,
  PageViewportSize,
  SourceDocument,
  TextAnnotation
} from "@/types/editor";

type CreateSessionInput = {
  documents: SourceDocument[];
};

type EditorSessionContextValue = {
  session: EditorSession | null;
  selectedAnnotationId: string | null;
  autoFocusAnnotationId: string | null;
  selectedPageIds: string[];
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
  addSourceDocument: (document: SourceDocument) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  togglePageSelection: (pageId: string) => void;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  rotatePages: (direction: "left" | "right") => void;
  setScale: (scale: number) => void;
  setCurrentPage: (pageId: string) => void;
  setPageViewport: (pageId: string, size: PageViewportSize) => void;
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
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);

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
    const pageOrder = createPageRefs(input.documents);
    setSession({
      sessionId: createId(),
      documents: input.documents,
      annotations: [],
      currentPageId: pageOrder[0]?.id ?? null,
      pageOrder,
      scale: 1.25,
      pageViewports: {},
      createdAt: now,
      updatedAt: now
    });
    setSelectedAnnotationId(null);
    setAutoFocusAnnotationId(null);
    setSelectedPageIds([]);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setSelectedAnnotationId(null);
    setAutoFocusAnnotationId(null);
    setSelectedPageIds([]);
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

  const addSourceDocument = useCallback(
    (document: SourceDocument) => {
      const newPages = createPageRefs([document]);
      touch((current) => ({
        ...current,
        documents: [...current.documents, document],
        pageOrder: [...current.pageOrder, ...newPages],
        currentPageId: current.currentPageId ?? newPages[0]?.id ?? null
      }));
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
          currentPageId: movedPage.id
        };
      });
    },
    [touch]
  );

  const togglePageSelection = useCallback((pageId: string) => {
    setSelectedPageIds((current) =>
      current.includes(pageId)
        ? current.filter((id) => id !== pageId)
        : [...current, pageId]
    );
  }, []);

  const selectAllPages = useCallback(() => {
    setSelectedPageIds(session?.pageOrder.map((page) => page.id) ?? []);
  }, [session?.pageOrder]);

  const clearPageSelection = useCallback(() => {
    setSelectedPageIds([]);
  }, []);

  const rotatePages = useCallback(
    (direction: "left" | "right") => {
      touch((current) => {
        const targetIds =
          selectedPageIds.length > 0
            ? selectedPageIds
            : current.currentPageId
              ? [current.currentPageId]
              : [];

        if (targetIds.length === 0) {
          return current;
        }

        return {
          ...current,
          pageOrder: current.pageOrder.map((page) =>
            targetIds.includes(page.id)
              ? {
                  ...page,
                  rotation: rotateValue(page.rotation, direction)
                }
              : page
          )
        };
      });
    },
    [selectedPageIds, touch]
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
    (pageId: string) => {
      touch((current) => ({
        ...current,
        currentPageId: pageId
      }));
    },
    [touch]
  );

  const setPageViewport = useCallback(
    (pageId: string, size: PageViewportSize) => {
      touch((current) => ({
        ...current,
        pageViewports: {
          ...current.pageViewports,
          [pageId]: size
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
      selectedPageIds,
      createSession,
      clearSession,
      addTextAnnotation,
      updateTextAnnotation,
      deleteTextAnnotation,
      selectAnnotation,
      clearAutoFocusAnnotation,
      addSourceDocument,
      reorderPages,
      togglePageSelection,
      selectAllPages,
      clearPageSelection,
      rotatePages,
      setScale,
      setCurrentPage,
      setPageViewport
    }),
    [
      session,
      selectedAnnotationId,
      autoFocusAnnotationId,
      selectedPageIds,
      createSession,
      clearSession,
      addTextAnnotation,
      updateTextAnnotation,
      deleteTextAnnotation,
      selectAnnotation,
      clearAutoFocusAnnotation,
      addSourceDocument,
      reorderPages,
      togglePageSelection,
      selectAllPages,
      clearPageSelection,
      rotatePages,
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

function createPageRefs(documents: SourceDocument[]): PageRef[] {
  return documents.flatMap((document) =>
    Array.from({ length: document.pageCount }, (_, index) => ({
      id: createId(),
      sourceDocumentId: document.id,
      sourcePageIndex: index,
      rotation: 0 as PageRotation
    }))
  );
}

function rotateValue(
  rotation: PageRotation,
  direction: "left" | "right"
): PageRotation {
  const delta = direction === "right" ? 90 : -90;
  return (((rotation + delta + 360) % 360) as PageRotation);
}

export function useEditorSession(): EditorSessionContextValue {
  const context = useContext(EditorSessionContext);

  if (!context) {
    throw new Error("useEditorSession must be used inside EditorSessionProvider");
  }

  return context;
}
