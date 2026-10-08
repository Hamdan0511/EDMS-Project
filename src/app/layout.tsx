import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Self-hosted (no Google Fonts network dependency at build time): GeistSans
// and GeistMono ship their own woff2 files via the `geist` npm package, and
// Fraunces ships via `@fontsource-variable/fraunces` — both already vendored
// into node_modules, so `npm run build` never needs outbound network access.
const fraunces = localFont({
  variable: "--font-fraunces",
  src: [
    { path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Shanfari Furnishing — Connected Operations",
    template: "%s — Shanfari Furnishing",
  },
  description:
    "Shanfari Furnishing's connected digital workspace — bringing projects, information, communication, HSE and operational workflows together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
