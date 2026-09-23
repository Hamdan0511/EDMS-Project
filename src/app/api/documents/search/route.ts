import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { assertProjectMember } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

// The two "live" registers — always the only candidates through this
// route, whether or not a caller narrows further with ?registerScope=.
// Mail's "Attach Document" lookup and the Transmittal History search omit
// that param on purpose (a mail or transmittal can reference either a
// standalone document or a drawing), but even then MIGRATION_HOLD /
// ARCHIVED / MAIL_ATTACHMENT_REFERENCE documents are excluded — a held or
// archived document should never casually resurface as an attach/update
// target. This route only ever reads; it never creates or converts.
const SEARCHABLE_SCOPES = ["STANDALONE_DOCUMENT", "DRAWING"] as const;
type SearchableScope = (typeof SEARCHABLE_SCOPES)[number];
function isSearchableScope(value: string | null): value is SearchableScope {
  return !!value && (SEARCHABLE_SCOPES as readonly string[]).includes(value);
}

/** Read-only lookup feeding: Add/Update Documents' "Update Existing
 * Document" search, Placeholder completion search, Transmittal History's
 * document search, and Register Incoming Mail's Attach > Document modal.
 * Never mutates the Document Register — this route only ever reads. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const q = searchParams.get("q")?.trim() ?? "";
  const placeholdersOnly = searchParams.get("placeholdersOnly") === "1";
  const registerScopeParam = searchParams.get("registerScope");
  // Whether or not a specific scope was requested, MIGRATION_HOLD /
  // ARCHIVED / MAIL_ATTACHMENT_REFERENCE are never candidates through this
  // endpoint — only the two "live" registers are ever searchable here.
  const registerScopeFilter = isSearchableScope(registerScopeParam) ? registerScopeParam : { in: [...SEARCHABLE_SCOPES] };

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    await assertProjectMember(user, projectId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: {
      projectId,
      registerScope: registerScopeFilter,
      ...(placeholdersOnly ? { isPlaceholder: true } : {}),
      ...(q
        ? {
            OR: [
              { documentNo: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { type: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { type: true },
    orderBy: { documentNo: "asc" },
    take: 20,
  });

  return NextResponse.json(
    documents.map((d) => ({
      id: d.id,
      documentNo: d.documentNo,
      title: d.title,
      revision: d.currentRevision,
      typeName: d.type?.name ?? null,
    })),
  );
}
