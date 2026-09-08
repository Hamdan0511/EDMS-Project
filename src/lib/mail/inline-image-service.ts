import "server-only";

import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteStoredFile } from "@/lib/storage";

export class InlineImageError extends Error {}

export const MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024;

const MAGIC_BYTES: { mimeType: string; check: (b: Buffer) => boolean }[] = [
  { mimeType: "image/png", check: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mimeType: "image/gif", check: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  {
    mimeType: "image/webp",
    check: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** Identifies the real image format from file content — never trusts the
 * client-supplied MIME type/extension. Returns null if it isn't a
 * recognized, safe-to-embed raster image format. */
function detectImageMimeType(bytes: Buffer): string | null {
  for (const { mimeType, check } of MAGIC_BYTES) {
    if (check(bytes)) return mimeType;
  }
  return null;
}

export async function uploadInlineImage(params: {
  projectId: string;
  uploadedById: string;
  file: File;
}) {
  const { projectId, uploadedById, file } = params;

  if (!file || file.size === 0) {
    throw new InlineImageError("The selected image is empty.");
  }
  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    throw new InlineImageError("Image is too large. Maximum size is 5MB.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = detectImageMimeType(bytes);
  if (!mimeType) {
    throw new InlineImageError("Only PNG, JPEG, GIF, or WEBP images can be inserted.");
  }

  const safeFile = new File([bytes], file.name || "image", { type: mimeType });
  const { storedPath, sizeBytes } = await saveUploadedFile("mail-inline-images", safeFile);

  try {
    return await prisma.mailInlineImage.create({
      data: { projectId, uploadedById, storedPath, mimeType, sizeBytes },
    });
  } catch (err) {
    await deleteStoredFile(storedPath);
    throw err;
  }
}
