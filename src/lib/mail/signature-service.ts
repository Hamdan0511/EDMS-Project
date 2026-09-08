import "server-only";

import { prisma } from "@/lib/prisma";
import { sanitizeMailHtml } from "./sanitize-html";

export class SignatureError extends Error {}

export function listSignatures(userId: string) {
  return prisma.signature.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function createSignature(params: {
  userId: string;
  name: string;
  contentHtml: string;
  isDefault: boolean;
}) {
  const { userId, name, contentHtml, isDefault } = params;
  if (!name.trim()) throw new SignatureError("Name is required.");
  if (!contentHtml.trim()) throw new SignatureError("Content is required.");

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.signature.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return tx.signature.create({
      data: { userId, name: name.trim(), contentHtml: sanitizeMailHtml(contentHtml), isDefault },
    });
  });
}

export async function updateSignature(params: {
  id: string;
  userId: string;
  name: string;
  contentHtml: string;
  isDefault: boolean;
}) {
  const { id, userId, name, contentHtml, isDefault } = params;
  const existing = await prisma.signature.findFirst({ where: { id, userId } });
  if (!existing) throw new SignatureError("Signature not found.");
  if (!name.trim()) throw new SignatureError("Name is required.");
  if (!contentHtml.trim()) throw new SignatureError("Content is required.");

  return prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.signature.updateMany({ where: { userId, isDefault: true, NOT: { id } }, data: { isDefault: false } });
    }
    return tx.signature.update({
      where: { id },
      data: { name: name.trim(), contentHtml: sanitizeMailHtml(contentHtml), isDefault },
    });
  });
}

export async function deleteSignature(params: { id: string; userId: string }) {
  const existing = await prisma.signature.findFirst({ where: { id: params.id, userId: params.userId } });
  if (!existing) throw new SignatureError("Signature not found.");
  await prisma.signature.delete({ where: { id: params.id } });
}
