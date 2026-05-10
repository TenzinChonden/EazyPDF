export type EditorSession = {
  sessionId: string;
  documents: SourceDocument[];
  pageOrder: PageRef[];
  annotations: Annotation[];
  currentPageId: string | null;
  scale: number;
  pageViewports: Record<string, PageViewportSize>;
  createdAt: number;
  updatedAt: number;
};

export type SourceDocument = {
  id: string;
  fileName: string;
  fileSize: number;
  pdfBytes: ArrayBuffer;
  pageCount: number;
};

export type PageRef = {
  id: string;
  sourceDocumentId: string;
  sourcePageIndex: number;
  rotation: PageRotation;
};

export type PageRotation = 0 | 90 | 180 | 270;

export type Annotation = TextAnnotation;

export type TextAnnotation = {
  id: string;
  type: "text";
  pageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  html: string;
  plainText: string;
  text: string;
  defaultFontFamily: TextFontFamily;
  defaultFontSize: number;
  defaultColor: string;
  backgroundColor: TextBackgroundColor;
  backgroundTransparent: boolean;
  bold: boolean;
  italic: boolean;
};

export type TextFontFamily =
  | "Helvetica"
  | "Times Roman"
  | "Courier"
  | "Arial"
  | "Georgia"
  | "Verdana"
  | "Trebuchet MS"
  | "Garamond"
  | "Monospace";

export type TextBackgroundColor =
  | "transparent"
  | "#FFFFFF"
  | "#FEF3C7"
  | "#F3F4F6";

export type PageViewportSize = {
  width: number;
  height: number;
};

export type EditorTool = "select" | "text";
