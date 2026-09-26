import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { NewEmergencyEventForm } from "@/components/hse/new-emergency-event-form";
import { Siren } from "@/components/ui/icons";

export default async function NewEmergencyEventPage() {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }

  const canManage = await hasPermission(user.id, "HSE_MANAGE_EMERGENCY", { projectId: membership.projectId });
  if (!canManage) {
    return (
      <div className="p-6">
        <EmptyState title="You do not have permission to report emergency events" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Siren size={20} className="text-red-600" />
        <h1 className="text-lg font-semibold tracking-tight text-text-primary">Report Emergency Event</h1>
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href="/hse/emergency/events" className="mb-3 inline-block text-[12px] text-brand-700 hover:underline">
          ← Back to Emergency Events
        </Link>
        <NewEmergencyEventForm projectId={membership.projectId} />
      </div>
    </div>
  );
}
