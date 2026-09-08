import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app-shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  const { q = "" } = await searchParams;

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const projectId = membership.projectId;
  const term = q.trim();

  const [mails, documents] = term
    ? await Promise.all([
        prisma.mail.findMany({
          where: {
            projectId,
            status: "SENT",
            OR: [{ senderId: user.id }, { recipients: { some: { userId: user.id } } }],
            subject: { contains: term, mode: "insensitive" },
          },
          take: 25,
        }),
        prisma.document.findMany({
          where: {
            projectId,
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { documentNo: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 25,
        }),
      ])
    : [[], []];

  return (
    <div>
      <PageHeader title={`Search results for "${term}"`} />
      <div className="p-6">
        {!term || (mails.length === 0 && documents.length === 0) ? (
          <EmptyState
            title="No results found"
            description="Search covers mail subjects and document titles/numbers on your current project."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {mails.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-text-secondary">Mail ({mails.length})</h2>
                <ul className="flex flex-col gap-1">
                  {mails.map((m) => (
                    <li key={m.id}>
                      <Link href={`/mail/${m.id}`} className="text-sm text-brand-700 hover:underline">
                        {m.mailNumber} — {m.subject}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {documents.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-text-secondary">
                  Documents ({documents.length})
                </h2>
                <ul className="flex flex-col gap-1">
                  {documents.map((d) => (
                    <li key={d.id} className="text-sm text-text-primary">
                      {d.documentNo} — {d.title}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
