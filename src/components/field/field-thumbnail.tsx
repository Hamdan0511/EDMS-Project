import { ImageIcon } from "@/components/ui/icons";

/** Small square evidence thumbnail used in list tables — only renders a real
 * uploaded image; falls back to a neutral icon tile when a record has no
 * evidence yet (never a fabricated placeholder photo). */
export function FieldThumbnail({ attachmentId, alt }: { attachmentId?: string | null; alt: string }) {
  if (!attachmentId) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background text-text-muted">
        <ImageIcon size={14} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/field/attachments/${attachmentId}`}
      alt={alt}
      className="h-9 w-9 shrink-0 rounded-[3px] border border-border object-cover"
    />
  );
}
