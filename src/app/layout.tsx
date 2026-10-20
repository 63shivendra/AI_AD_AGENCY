import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Growth Engine — AI Ad Agency & Local Growth Engine",
  description:
    "Hinglish AI ad studio, WhatsApp lead funnels and Google review boosters for Kanpur businesses.",
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-ink text-chalk">{children}</body>
    </html>
  );
}
