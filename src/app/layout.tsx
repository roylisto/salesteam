import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { ActionProgress } from "@/components/action-progress";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Salesteam",
    template: "%s · Salesteam",
  },
  description:
    "Platform operasi penjualan multitenan untuk outlet, pesanan, dan tim lapangan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full font-sans">
        <NextTopLoader
          color="var(--top-progress-color)"
          height={3}
          showSpinner={false}
          showForHashAnchor={false}
          shadow={false}
          template='<div role="progressbar" aria-label="Memuat halaman"><div class="bar" role="bar" aria-hidden="true"></div></div>'
        />
        <ActionProgress />
        <NuqsAdapter>
          {children}
          <Toaster position="top-right" />
        </NuqsAdapter>
      </body>
    </html>
  );
}
