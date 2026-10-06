"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle, MapPin, ChevronDown, ChevronRight } from "@/components/ui/icons";
import { FieldAreaPicker, type FieldAreaOption } from "@/components/field/field-area-picker";

type AreaNode = FieldAreaOption & { code: string | null; levelType: string | null };

function AreaTreeNode({ node, depth }: { node: AreaNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const children = node.children as AreaNode[];
  const hasChildren = children.length > 0;

  return (
    <li>
      <div className="flex items-center justify-between px-4 py-2 text-[13px]" style={{ paddingLeft: `${16 + depth * 20}px` }}>
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="flex h-4 w-4 items-center justify-center text-text-muted hover:text-text-primary">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="inline-block w-4" />
          )}
          <Link href={`/field/areas/${node.id}`} className="text-brand-700 hover:underline">
            {node.name}
            {node.levelType && <span className="ml-2 text-[11px] text-text-muted">{node.levelType}</span>}
          </Link>
        </div>
        {node.code && <span className="text-[11px] text-text-muted">{node.code}</span>}
      </div>
      {hasChildren && expanded && (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {children.map((child) => (
            <AreaTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FieldAreasManager({
  projectId,
  tree,
  canManage,
}: {
  projectId: string;
  tree: AreaNode[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [code, setCode] = useState("");
  const [levelType, setLevelType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/field/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name, parentId: parentId || undefined, code: code || undefined, levelType: levelType || undefined, description: description || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to create the location.");
      return;
    }
    setName("");
    setParentId("");
    setCode("");
    setLevelType("");
    setDescription("");
    setModalOpen(false);
    router.refresh();
  }

  return (
    <>
      {canManage && (
        <div className="mb-3 flex justify-end">
          <Button type="button" variant="primary" onClick={() => setModalOpen(true)}>
            Add Location
          </Button>
        </div>
      )}

      {tree.length === 0 ? (
        <EmptyState
          icon={<MapPin size={26} strokeWidth={1.25} />}
          title="No site locations configured yet"
          description="Add a location hierarchy (e.g. Building > Floor > Zone > Room) so observations, issues, and inspections can be organized by where they happened."
          action={
            canManage ? (
              <button type="button" onClick={() => setModalOpen(true)} className={buttonClass("primary", "md")}>
                Add Location
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-[3px] border border-border bg-white">
          <ul className="flex flex-col divide-y divide-border">
            {tree.map((node) => (
              <AreaTreeNode key={node.id} node={node} depth={0} />
            ))}
          </ul>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Site Location">
        <div className="flex flex-col gap-3">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Name *
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Level 03" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Type
              <Input value={levelType} onChange={(e) => setLevelType(e.target.value)} placeholder="e.g. Building, Floor, Zone, Room" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Code
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Parent Location
            <FieldAreaPicker tree={tree} name="parentId" value={parentId} onChange={setParentId} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Description
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <Button type="button" variant="primary" onClick={submit} disabled={submitting} className="self-start">
            {submitting ? "Saving…" : "Add Location"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
