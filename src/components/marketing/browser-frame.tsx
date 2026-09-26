import Image from "next/image";

/** Frames a real, captured screenshot of the actual application (never a
 * fabricated or mocked-up screen) inside a minimal browser chrome, so it
 * reads unambiguously as "real software" rather than a decorative image. */
export function BrowserFrame({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[4px] border border-border-strong bg-white shadow-[0_24px_60px_-24px_rgba(28,23,18,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-brand-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
        <span className="ml-3 rounded-[2px] bg-white px-3 py-1 text-[10px] tracking-wide text-text-muted">
          workspace.shanfarifurnishing.local
        </span>
      </div>
      <div className="relative aspect-[16/10] w-full bg-background">
        <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-top" priority={priority} unoptimized />
      </div>
    </div>
  );
}
