import Link from "next/link";
import { requirePageContext } from "@/lib/page-context";
import { hasPermission } from "@/lib/auth/permissions";
import { listFieldPhotos } from "@/lib/services/field/photo-service";
import { listFieldAreaTree } from "@/lib/services/field/area-service";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterBar, ResultSummary } from "@/components/ui/filter-bar";
import { FieldPageHeader } from "@/components/field/field-page-header";
import { FieldAreaPicker } from "@/components/field/field-area-picker";
import { Camera } from "@/components/ui/icons";
import { NewFieldPhotoForm } from "@/components/field/new-field-photo-form";
import { PHOTO_CATEGORIES } from "@/lib/field/status";
import { PhotoGalleryGrid } from "@/components/field/photo-gallery-grid";

export default async function FieldPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ areaId?: string; category?: string; siteWalkId?: string }>;
}) {
  const { user, membership } = await requirePageContext();
  if (!membership) {
    return (
      <div className="p-6">
        <EmptyState title="You are not assigned to a project" />
      </div>
    );
  }
  const params = await searchParams;
  const projectId = membership.projectId;
  const canManage = await hasPermission(user.id, "FIELD_MANAGE_PHOTOS", { projectId });

  const [photos, areaTree] = await Promise.all([
    listFieldPhotos({ projectId, areaId: params.areaId, category: params.category }),
    listFieldAreaTree(projectId),
  ]);

  return (
    <div className="p-6">
      <FieldPageHeader
        title="Site Photos & Evidence"
        description="Every photo captured on site, with its real location, category, and uploader — create an Observation, Issue, or Punch Item directly from a photo without re-entering evidence."
        action={canManage ? <NewFieldPhotoForm projectId={projectId} areaTree={areaTree} siteWalkId={params.siteWalkId} defaultAreaId={params.areaId} /> : undefined}
      />

      <form action="/field/photos" method="GET" className="mt-4">
        <FilterBar>
          <FieldAreaPicker tree={areaTree} name="areaId" defaultValue={params.areaId} className="w-56" />
          <Select name="category" defaultValue={params.category ?? ""} className="w-40">
            <option value="">All Categories</option>
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
          <Link href="/field/photos" className="text-[13px] text-text-secondary hover:underline">Clear</Link>
        </FilterBar>
      </form>

      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera size={26} strokeWidth={1.25} />}
          title="No photos uploaded yet"
          description="Once a site photo is uploaded, it will appear here."
          action={canManage ? <NewFieldPhotoForm projectId={projectId} areaTree={areaTree} siteWalkId={params.siteWalkId} defaultAreaId={params.areaId} /> : undefined}
        />
      ) : (
        <>
          <ResultSummary count={photos.length} noun="photo" />
          <PhotoGalleryGrid
            canManage={canManage}
            photos={photos.map((p) => ({
              id: p.id,
              attachmentId: p.attachmentId,
              fileName: p.attachment.fileName,
              category: p.attachment.category,
              areaName: p.area?.name ?? null,
              createdByName: p.createdBy.name,
              createdAt: p.createdAt.toISOString(),
            }))}
          />
        </>
      )}
    </div>
  );
}
