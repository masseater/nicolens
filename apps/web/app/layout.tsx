import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/shared/ui/providers";
import { AppHeader } from "@/widgets/app-header";

// eslint-disable-next-line import/no-unassigned-import -- CSS side-effect import
import "./globals.css";

// eslint-disable-next-line new-cap -- Next.js font factory function
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// eslint-disable-next-line new-cap -- Next.js font factory function
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "nicolens",
  description: "ニコニコ動画のSnapshot APIを用いた軽量な動画検索サイト",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="ja" suppressHydrationWarning>
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <Providers>
        <AppHeader />
        <main className="h-[calc(100svh-var(--header-height))]">{children}</main>
      </Providers>
    </body>
  </html>
);

// oxlint-disable-next-line import/no-default-export -- Next.js layouts require default export
export default RootLayout;
