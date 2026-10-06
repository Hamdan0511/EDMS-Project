"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CreateFromPhotoButton } from "@/components/field/create-from-photo-button";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "@/components/ui/icons";

export type GalleryPhoto = {
  id: string;
  attachmentId: string;
  fileName: string;
  category: string | null;
  areaName: string | null;
  createdByName: string;
  createdAt: string;
};

export function PhotoGalleryGrid({ photos, canManage }: { photos: GalleryPhoto[]; canManage: boolean }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : Math.min(i + 1, photos.length - 1)));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : Math.max(i - 1, 0)));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxIndex, photos.length]);

  const active = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <div key={p.id} className="flex flex-col overflow-hidden rounded-[3px] border border-border bg-white">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="group relative flex aspect-[4/3] items-center justify-center bg-background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/field/attachments/${p.attachmentId}`} alt={p.fileName} className="h-full w-full object-cover" />
              <span className="absolute inset-0 hidden items-center justify-center bg-black/30 group-hover:flex">
                <Maximize2 size={18} className="text-white" />
              </span>
            </button>
            <div className="flex flex-col gap-1 px-2.5 py-2">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-medium text-text-primary" title={p.fileName}>
                  {p.category ?? "General"}
                </span>
                <span className="shrink-0 text-[10px] text-text-muted">{new Date(p.createdAt).toLocaleDateString("en-GB")}</span>
              </div>
              <p className="truncate text-[11px] text-text-muted">{p.areaName ?? "No location"} · {p.createdByName}</p>
              {canManage && <CreateFromPhotoButton photoId={p.id} />}
            </div>
          </div>
        ))}
      </div>

      {active &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{active.fileName}</p>
                <p className="text-[11px] text-white/70">
                  {active.category ?? "General"} · {active.areaName ?? "No location"} · {active.createdByName} · {new Date(active.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
              <button type="button" onClick={() => setLightboxIndex(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-[3px] text-white hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-12 pb-6">
              {lightboxIndex! > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i === null ? null : Math.max(i - 1, 0)))}
                  aria-label="Previous photo"
                  className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/field/attachments/${active.attachmentId}`} alt={active.fileName} className="max-h-full max-w-full object-contain" />
              {lightboxIndex! < photos.length - 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((i) => (i === null ? null : Math.min(i + 1, photos.length - 1)))}
                  aria-label="Next photo"
                  className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
