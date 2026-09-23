"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, File as FileIcon } from "@/components/ui/icons";

/** Caps how many PDF thumbnails render at once, across the whole app. A
 * drawing register page can mount dozens of PdfThumbnail instances at the
 * same time; without this, every one of them independently fetches the
 * full PDF bytes and asks pdf.js to parse+paint a page simultaneously,
 * which is exactly what was making thumbnails appear to "hang forever" —
 * they weren't stuck, they were legitimately queued behind 20+ concurrent
 * multi-megabyte PDF renders competing for the same CPU/memory on a
 * resource-constrained machine. Rendering fewer at a time makes each one
 * finish quickly instead of all of them crawling together. */
const MAX_CONCURRENT_RENDERS = 3;
let activeRenders = 0;
const renderQueue: Array<() => void> = [];

function acquireRenderSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (activeRenders < MAX_CONCURRENT_RENDERS) {
        activeRenders++;
        resolve(() => {
          activeRenders--;
          const next = renderQueue.shift();
          if (next) next();
        });
      } else {
        renderQueue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

/** Renders a real page-1 thumbnail from actual PDF bytes fetched from
 * `fileUrl`, client-side, via pdfjs-dist — chosen over a server-side
 * renderer to avoid a native `canvas` build dependency on Windows. Only
 * starts once the card is actually near the viewport (IntersectionObserver)
 * and only ever runs MAX_CONCURRENT_RENDERS of these at once app-wide.
 * Falls back to a plain file-type icon for non-PDF files or on render
 * failure; never fabricates a placeholder that looks like a real
 * thumbnail. */
export function PdfThumbnail({
  fileUrl,
  mimeType,
  alt,
}: {
  fileUrl: string | null;
  mimeType: string | null;
  alt: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unsupported">(
    mimeType === "application/pdf" ? "loading" : "unsupported",
  );

  useEffect(() => {
    if (mimeType !== "application/pdf") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mimeType]);

  useEffect(() => {
    if (!fileUrl || mimeType !== "application/pdf" || !visible) {
      return;
    }

    let cancelled = false;
    let releaseSlot: (() => void) | null = null;

    (async () => {
      releaseSlot = await acquireRenderSlot();
      if (cancelled) return;
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Failed to fetch file: " + res.status);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const targetWidth = 200;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = targetWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("No 2D context");

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) setStatus("ready");
      } catch (err) {
        console.error("PDF thumbnail render failed:", err);
        if (!cancelled) setStatus("error");
      } finally {
        releaseSlot?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, mimeType, visible]);

  if (mimeType?.startsWith("image/") && fileUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl} alt={alt} className="h-full w-full object-contain" />;
  }

  return (
    <div ref={containerRef} className="relative flex h-full w-full items-center justify-center bg-brand-50">
      <canvas ref={canvasRef} className={status === "ready" ? "h-full w-full object-contain" : "hidden"} />
      {status !== "ready" && (
        <div className="flex flex-col items-center gap-1 text-text-muted">
          {mimeType === "application/pdf" ? (
            <FileText size={28} strokeWidth={1.25} />
          ) : mimeType?.startsWith("image/") ? (
            <ImageIcon size={28} strokeWidth={1.25} />
          ) : (
            <FileIcon size={28} strokeWidth={1.25} />
          )}
          {status === "loading" && <span className="text-[10px]">Loading…</span>}
        </div>
      )}
    </div>
  );
}
