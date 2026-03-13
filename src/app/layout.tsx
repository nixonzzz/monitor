import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-jetbrains"
});

export const metadata: Metadata = {
  title: "Monitor",
  description: "Мониторинг рынка в реальном времени"
};

export const viewport = { width: "device-width", initialScale: 1, maximumScale: 5 };

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ru" className={jetbrainsMono.variable}>
      <body className="min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
