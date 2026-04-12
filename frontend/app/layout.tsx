import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURA",
  description: "AI life coach cá nhân hóa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
