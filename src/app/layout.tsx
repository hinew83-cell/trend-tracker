import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trend Tracker | Discover Google Search Trends",
  description: "Track Google Search interest trends and visualize daily popular topics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
