import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageContext } from "@/lib/page-context";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { getSiteWalkSummary, START_WALK_PERMISSIONS } from "@/lib/services/field/site-walk-service";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeft, EyeIcon, AlertCircle, ListTodo, Camera } from "@/components/ui/icons";
import { EndSiteWalkButton } from "@/components/field/end-site-walk-button";
import {
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_STATUS_BADGE_CLASSES,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_BADGE_CLASSES,
  PUNCH_ITEM_STATUS_LABELS,
  PUNCH_ITEM_STATUS_BADGE_CLASSES,
} from "@/lib/field/status";

export default async function SiteWalkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) return null;
  const { id } = await params;
  const projectId = membership.projectId;

  let summary;
  try {
    summary = await getSiteWalkSummary(id, projectId);
  } catch {
    notFound();
  }
  const { walk, observations, issues, punchItems, photos } = summary;

  const canManage = await hasAnyPermission(user.id, START_WALK_PERMISSIONS, { projectId });
  const isActive = !walk.endedAt;
  const quickCaptureQS = `?siteWalkId=${walk.id}${walk.areaId ? `&areaId=${walk.areaId}` : ""}`;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Site Walk</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-text-primary">{walk.purpose}</h1>
        </div>
        <Link href="/field/site-walks" className={buttonClass("secondary", "md")}>
          <ChevronLeft size={14} />
          Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-[3px] border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {isActive ? (
              <StatusBadge label="Active" className="bg-emerald-100 text-emerald-800" />
            ) : (
              <StatusBadge label="Completed" className="bg-gray-200 text-gray-700" />
            )}
            <span className="text-[13px] text-text-secondary">
              {walk.area?.name ?? "No starting location"} · Started by {walk.startedBy.name} on {walk.startedAt.toLocaleString("en-GB")}
            </span>
          </div>
          {canManage && isActive && <EndSiteWalkButton walkId={walk.id} />}
        </div>

        {isActive && canManage && (
          <>
            <SectionHeader>Capture on this Walk</SectionHeader>
            <div className="flex flex-wrap gap-2 px-4 py-3">
              <Link href={`/field/observations/new${quickCaptureQS}`} className={buttonClass("secondary", "sm")}>
                <EyeIcon size={13} />
                New Observation
              </Link>
              <Link href={`/field/issues/new${quickCaptureQS}`} className={buttonClass("secondary", "sm")}>
                <AlertCircle size={13} />
                New Issue
              </Link>
              <Link href={`/field/punch/new${quickCaptureQS}`} className={buttonClass("secondary", "sm")}>
                <ListTodo size={13} />
                New Punch Item
              </Link>
              <Link href={`/field/photos${quickCaptureQS}`} className={buttonClass("secondary", "sm")}>
                <Camera size={13} />
                Upload Photo
              </Link>
            </div>
          </>
        )}

        <SectionHeader>Observations ({observations.length})</SectionHeader>
        {observations.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-muted">None captured on this walk yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {observations.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <Link href={`/field/observations/${o.id}`} className="text-brand-700 hover:underline">
                  {o.observationNumber} — {o.title}
                </Link>
                <StatusBadge label={OBSERVATION_STATUS_LABELS[o.status]} className={OBSERVATION_STATUS_BADGE_CLASSES[o.status]} />
              </li>
            ))}
          </ul>
        )}

        <SectionHeader>Issues ({issues.length})</SectionHeader>
        {issues.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-muted">None captured on this walk yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {issues.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <Link href={`/field/issues/${i.id}`} className="text-brand-700 hover:underline">
                  {i.issueNumber} — {i.title}
                </Link>
                <StatusBadge label={ISSUE_STATUS_LABELS[i.status]} className={ISSUE_STATUS_BADGE_CLASSES[i.status]} />
              </li>
            ))}
          </ul>
        )}

        <SectionHeader>Punch Items ({punchItems.length})</SectionHeader>
        {punchItems.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-muted">None captured on this walk yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {punchItems.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <Link href={`/field/punch/${p.id}`} className="text-brand-700 hover:underline">
                  {p.punchItemNumber} — {p.title}
                </Link>
                <StatusBadge label={PUNCH_ITEM_STATUS_LABELS[p.status]} className={PUNCH_ITEM_STATUS_BADGE_CLASSES[p.status]} />
              </li>
            ))}
          </ul>
        )}

        <SectionHeader>Photos ({photos.length})</SectionHeader>
        {photos.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-muted">None captured on this walk yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 px-4 py-3 sm:grid-cols-4 md:grid-cols-6">
            {photos.map((p) => (
              <a
                key={p.id}
                href={`/api/field/attachments/${p.attachmentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex aspect-square items-center justify-center overflow-hidden rounded-[3px] border border-border bg-background"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/field/attachments/${p.attachmentId}`} alt={p.attachment.fileName} className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
