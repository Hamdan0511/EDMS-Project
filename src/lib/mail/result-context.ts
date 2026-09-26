import "server-only";

import { prisma } from "@/lib/prisma";
import { buildFullMailWhere, parsePage, MAIL_PAGE_SIZE, type MailSearchParams } from "./query";

export type MailResultContext = {
  /** The exact query string to return to (`/mail?${returnQuery}`). */
  returnQuery: string;
  position: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
};

/** Rebuilds the exact ordered result set the user was looking at in the
 * Mail register (same tab/filters/standard-search, same page) from the
 * `return` query string carried on the View Mail link — never a broader
 * query, and always re-scoped to the authenticated user/project rather
 * than anything the `return` string itself could specify. Used only for
 * Previous/Next and a context-preserving Back link; never for
 * authorization (the mail itself is still independently verified against
 * the caller's project via getMailDetail). */
export async function resolveMailResultContext(
  returnQuery: string | null,
  currentMailId: string,
  ctx: { projectId: string; userId: string; organizationId: string },
): Promise<MailResultContext | null> {
  if (!returnQuery) return null;

  const params = Object.fromEntries(new URLSearchParams(returnQuery).entries()) as MailSearchParams;
  const page = parsePage(params.page);
  const where = await buildFullMailWhere(params, ctx, prisma);

  const pageIds = await prisma.mail.findMany({
    where,
    select: { id: true },
    // Must exactly match the register's own tiebreaker (see mail/page.tsx)
    // or Previous/Next would be resolved against a differently-ordered set.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * MAIL_PAGE_SIZE,
    take: MAIL_PAGE_SIZE,
  });

  const index = pageIds.findIndex((m) => m.id === currentMailId);
  if (index === -1) {
    // The result set has shifted (e.g. re-sorted, mail moved off this page) —
    // still honor Back, just without a reliable position/prev/next.
    return { returnQuery, position: 0, total: pageIds.length, prevId: null, nextId: null };
  }

  return {
    returnQuery,
    position: index + 1,
    total: pageIds.length,
    prevId: index > 0 ? pageIds[index - 1].id : null,
    nextId: index < pageIds.length - 1 ? pageIds[index + 1].id : null,
  };
}
