export type EditorSession = {
  sessionId: string;
  fileName: string;
  fileSize: number;
  pdfBytes: ArrayBuffer;
  annotations: Annotation[];
  currentPage: number;
  pageOrder: number[];
  scale: number;
  pageViewports: Record<number, PageViewportSize>;
  createdAt: number;
  updatedAt: number;
};

export type Annotation = TextAnnotation;

export type TextAnnotation = {
  id: string;
  type: "text";
  pageNumber: number;
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
