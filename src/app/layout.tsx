import type { Metadata } from "next";
import "./globals.css";
import { EditorSessionProvider } from "@/context/EditorSessionContext";

export const metadata: Metadata = {
  title: "EazyPDF",
  description: "Edit PDFs in your browser. No account needed."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body>
        <EditorSessionProvider>{children}</EditorSessionProvider>
      </body>
    </html>
  );
}
