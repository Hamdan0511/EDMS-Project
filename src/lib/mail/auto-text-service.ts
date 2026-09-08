import "server-only";

import { prisma } from "@/lib/prisma";
import { sanitizeMailHtml } from "./sanitize-html";

export class AutoTextError extends Error {}

export function listAutoTexts(projectId: string) {
  return prisma.autoText.findMany({ where: { projectId }, orderBy: { name: "asc" } });
}

export async function createAutoText(params: {
  projectId: string;
  userId: string;
  name: string;
  contentHtml: string;
  description?: string;
}) {
  const { projectId, userId, name, contentHtml, description } = params;
  if (!name.trim()) throw new AutoTextError("Name is required.");
  if (!contentHtml.trim()) throw new AutoTextError("Content is required.");

  const existing = await prisma.autoText.findUnique({ where: { projectId_name: { projectId, name: name.trim() } } });
  if (existing) throw new AutoTextError(`An Auto Text named "${name.trim()}" already exists for this project.`);

  return prisma.autoText.create({
    data: {
      projectId,
      createdById: userId,
      name: name.trim(),
      contentHtml: sanitizeMailHtml(contentHtml),
      description: description?.trim() || null,
    },
  });
}

export async function updateAutoText(params: {
  id: string;
  projectId: string;
  name: string;
  contentHtml: string;
  description?: string;
}) {
  const { id, projectId, name, contentHtml, description } = params;
  const existing = await prisma.autoText.findFirst({ where: { id, projectId } });
  if (!existing) throw new AutoTextError("Auto Text not found.");
  if (!name.trim()) throw new AutoTextError("Name is required.");
  if (!contentHtml.trim()) throw new AutoTextError("Content is required.");

  return prisma.autoText.update({
    where: { id },
    data: {
      name: name.trim(),
      contentHtml: sanitizeMailHtml(contentHtml),
      description: description?.trim() || null,
    },
  });
}

export async function deleteAutoText(params: { id: string; projectId: string }) {
  const existing = await prisma.autoText.findFirst({ where: { id: params.id, projectId: params.projectId } });
  if (!existing) throw new AutoTextError("Auto Text not found.");
  await prisma.autoText.delete({ where: { id: params.id } });
}
