import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <Providers>
          <div className="min-h-screen flex flex-col items-center px-4 py-8">
            <div className="w-full max-w-3xl">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

