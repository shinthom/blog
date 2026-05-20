import type { Metadata } from "next";
import { siteConfig } from "@/site.config";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  twitter: {
    card: "summary",
    title: siteConfig.title,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
