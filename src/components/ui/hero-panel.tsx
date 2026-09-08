import { existsSync } from "fs";
import path from "path";
import Image from "next/image";
import type { ReactNode } from "react";

const CANDIDATE_FILES = [
  "home-hero.jpg",
  "home-hero.jpeg",
  "home-hero.png",
  "home-hero.webp",
];

/**
 * Full-bleed Home page hero: background photo with a left-side ivory
 * wash so overlaid text/cards stay readable, and the room visible in
 * full on the right (large screens). Looks for a real photo at
 * public/home-hero.{jpg,jpeg,png,webp}; if none exists yet, falls back
 * to an on-brand abstract placeholder rather than an unlicensed photo.
 */
export function HeroPanel({ children }: { children: ReactNode }) {
  const found = CANDIDATE_FILES.find((f) => existsSync(path.join(process.cwd(), "public", f)));

  return (
    <div className="relative min-h-[calc(100vh-6rem)] overflow-hidden">
      <div className="absolute inset-0">
        {found ? (
          <Image
            src={`/${found}`}
            alt="Shanfari Furnishing interior"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <PlaceholderArt />
        )}
      </div>

      {/* Ivory wash: solid on mobile (content spans full width), a
          left-to-right fade on large screens so the room shows through
          on the right, matching the reference composition. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/80 lg:bg-gradient-to-r lg:from-background lg:via-background/78 lg:via-45% lg:to-transparent" />

      <div className="relative z-10 flex flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:max-w-2xl">
        {children}
      </div>
    </div>
  );
}

function PlaceholderArt() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-brand-100 via-brand-50 to-white">
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 400 300" preserveAspectRatio="none">
        <line x1="0" y1="260" x2="140" y2="120" stroke="var(--brand-300)" strokeWidth="1" />
        <line x1="20" y1="280" x2="160" y2="140" stroke="var(--brand-300)" strokeWidth="1" />
        <line x1="260" y1="40" x2="400" y2="-100" stroke="var(--brand-300)" strokeWidth="1" />
        <line x1="280" y1="60" x2="420" y2="-80" stroke="var(--brand-300)" strokeWidth="1" />
        <rect x="60" y="170" width="120" height="70" rx="4" fill="none" stroke="var(--brand-300)" strokeWidth="1" />
        <rect x="220" y="150" width="90" height="90" rx="4" fill="none" stroke="var(--brand-300)" strokeWidth="1" />
      </svg>
    </div>
  );
}
