import { requirePageContext } from "@/lib/page-context";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { HeroPanel } from "@/components/ui/hero-panel";
import { FileText, Send, FileClock, Inbox, Activity } from "@/components/ui/icons";

export default async function HomePage() {
  const { membership } = await requirePageContext();

  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState
          title="You are not assigned to a project"
          description="Ask a document controller to add you as a project member before you can view documents or mail."
        />
      </div>
    );
  }

  const projectId = membership.projectId;

  const [documentCount, mailCount, draftMailCount, unreadMailCount] = await Promise.all([
    prisma.document.count({ where: { projectId } }),
    prisma.mail.count({ where: { projectId, status: "SENT" } }),
    prisma.mail.count({ where: { projectId, status: "DRAFT", senderId: membership.userId } }),
    prisma.mailRecipient.count({
      where: { userId: membership.userId, readAt: null, mail: { projectId, status: "SENT" } },
    }),
  ]);

  return (
    <HeroPanel>
      <div>
        <p className="text-sm text-text-secondary">Welcome to</p>
        <h1 className="text-4xl font-semibold tracking-tight text-text-primary">Shanfari Furnishing</h1>
        <p className="mt-4 text-xl font-medium text-text-primary">{membership.project.shortName}</p>
        <p className="text-sm text-text-secondary">{membership.project.name}</p>
      </div>

      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Document Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile translucent label="Documents" value={documentCount} href="/documents" icon={FileText} />
          <StatTile translucent label="Mail (Sent)" value={mailCount} href="/mail" icon={Send} />
          <StatTile translucent label="My Drafts" value={draftMailCount} href="/mail?tab=drafts" icon={FileClock} />
          <StatTile translucent label="Unread Mail" value={unreadMailCount} href="/mail?tab=inbox" icon={Inbox} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Activity
        </h2>
        {documentCount === 0 && mailCount === 0 ? (
          <EmptyState
            className="border-white/60 bg-white/85"
            icon={<Activity size={26} strokeWidth={1.25} />}
            title="No activity yet on this project"
            description="Documents and mail you create will appear here."
          />
        ) : (
          <EmptyState
            className="border-white/60 bg-white/85"
            icon={<Activity size={26} strokeWidth={1.25} />}
            title="Activity feed not yet available"
            description="A detailed activity timeline is planned for a future update."
          />
        )}
      </div>
    </HeroPanel>
  );
}
