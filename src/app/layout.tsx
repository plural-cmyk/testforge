import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TestForge — AI-Powered Test Automation",
  description:
    "Generate, run, and self-heal comprehensive test suites for your entire application with AI. Supports frontend, backend, and E2E testing.",
  keywords: [
    "TestForge",
    "AI testing",
    "test automation",
    "self-healing tests",
    "Playwright",
    "Vitest",
    "Next.js testing",
  ],
  authors: [{ name: "TestForge Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "TestForge — AI-Powered Test Automation",
    description: "Test your entire app with AI. Generate, run, and self-heal tests automatically.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
