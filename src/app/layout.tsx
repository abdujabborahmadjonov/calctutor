import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

import { AppHeader } from "@/components/AppHeader";
import { MockBanner } from "@/components/MockBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CalcTutor",
  description: "Step-by-step Calculus I and II help for students in Alberta.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <MockBanner />
        <AppHeader />
        {children}
        <footer className="mt-auto border-t px-4 py-5 text-center text-xs text-muted-foreground">
          Explanations are AI-generated; every final answer is self-checked, and
          CAS-verified where marked.
        </footer>
      </body>
    </html>
  );
}
