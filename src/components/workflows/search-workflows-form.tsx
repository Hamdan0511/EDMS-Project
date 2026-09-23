"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TransferListModal, type TransferOption } from "./transfer-list-modal";
import { DATE_FIELD_OPTIONS, GROUP_BY_OPTIONS, SORT_OPTIONS, PAGE_SIZE_OPTIONS } from "@/lib/workflows/search-constants";

const WORKFLOW_STATUS_OPTIONS: TransferOption[] = [
  { value: "COMPLETED", label: "Completed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REJECTED", label: "Rejected" },
  { value: "TERMINATED", label: "Terminated" },
];

const STEP_STATUS_OPTIONS: TransferOption[] = [
  { value: "Completed", label: "Completed" },
  { value: "Current", label: "Current" },
  { value: "Forecast", label: "Forecast" },
  { value: "Overdue", label: "Overdue" },
  { value: "Skipped", label: "Skipped" },
  { value: "Terminated", label: "Terminated" },
];

type SavedSearchEntry = { id: string; name: string; filters: Record<string, string> };

export function SearchWorkflowsForm({
  projectId,
  templates,
  outcomeOptions,
  initial,
}: {
  projectId: string;
  templates: { id: string; name: string }[];
  outcomeOptions: { code: string; label: string }[];
  initial: {
    workflowStatus: string;
    templateId: string;
    workflowNo: string;
    initiator: string;
    workflowName: string;
    dateField: string;
    dateFrom: string;
    dateTo: string;
    superSearch: string;
    stepStatus: string;
    stepOutcome: string;
    documentNo: string;
    assignedTo: string;
    myTasksOnly: boolean;
    groupBy: string;
    sort: string;
    pageSize: string;
  };
}) {
  const router = useRouter();
  const [workflowStatus, setWorkflowStatus] = useState<string[]>(
    initial.workflowStatus ? initial.workflowStatus.split(",").filter(Boolean) : [],
  );
  const [stepStatus, setStepStatus] = useState<string[]>(
    initial.stepStatus ? initial.stepStatus.split(",").filter(Boolean) : [],
  );
  const [workflowStatusModalOpen, setWorkflowStatusModalOpen] = useState(false);
  const [stepStatusModalOpen, setStepStatusModalOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearchEntry[]>([]);

  useEffect(() => {
    fetch(`/api/saved-searches?projectId=${projectId}&module=WORKFLOWS`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SavedSearchEntry[]) => setSavedSearches(data))
      .catch(() => setSavedSearches([]));
  }, [projectId]);

  function labelsFor(values: string[], options: TransferOption[]): string {
    if (values.length === 0) return "<All>";
    return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
  }

  function currentFormValues(form: HTMLFormElement): Record<string, string> {
    const fd = new FormData(form);
    const out: Record<string, string> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v) out[k] = v;
    }
    return out;
  }

  async function saveSearchAs(form: HTMLFormElement) {
    const name = window.prompt("Save this search as:");
    if (!name || !name.trim()) return;
    const filters = currentFormValues(form);
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, module: "WORKFLOWS", name: name.trim(), filters }),
    });
    if (res.ok) {
      const refreshed = await fetch(`/api/saved-searches?projectId=${projectId}&module=WORKFLOWS`);
      if (refreshed.ok) setSavedSearches(await refreshed.json());
    }
  }

  function loadSavedSearch(id: string) {
    const found = savedSearches.find((s) => s.id === id);
    if (!found) return;
    const sp = new URLSearchParams(found.filters);
    sp.set("searched", "1");
    router.push(`/workflows?${sp.toString()}`);
  }

  return (
    <form action="/workflows" method="GET" className="rounded-[3px] border border-border bg-white">
      <input type="hidden" name="searched" value="1" />
      <input type="hidden" name="workflowStatus" value={workflowStatus.join(",")} />
      <input type="hidden" name="stepStatus" value={stepStatus.join(",")} />

      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[14px] font-semibold text-text-primary">Search Workflows</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => saveSearchAs(e.currentTarget.closest("form") as HTMLFormElement)}
          >
            Save Search As
          </Button>
          <Select
            aria-label="Saved Searches"
            className="w-44"
            defaultValue=""
            onChange={(e) => e.target.value && loadSavedSearch(e.target.value)}
          >
            <option value="">— Saved Searches —</option>
            {savedSearches.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 p-4 text-[13px]">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <Field label="Workflow Status">
            <button
              type="button"
              onClick={() => setWorkflowStatusModalOpen(true)}
              className="flex h-8 w-full items-center rounded-[3px] border border-border bg-white px-2.5 text-left text-[13px] hover:border-accent"
            >
              {labelsFor(workflowStatus, WORKFLOW_STATUS_OPTIONS)}
            </button>
          </Field>

          <Field label="Template">
            <Select name="templateId" defaultValue={initial.templateId}>
              <option value="">&lt;All&gt;</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Workflow No.">
            <Input name="workflowNo" defaultValue={initial.workflowNo} />
          </Field>

          <Field label="Initiator">
            <Input name="initiator" defaultValue={initial.initiator} placeholder="— Enter search query here —" />
          </Field>

          <Field label="Workflow Name">
            <Input name="workflowName" defaultValue={initial.workflowName} />
          </Field>

          <Field label="Date Range">
            <div className="flex gap-2">
              <div className="w-40">
                <Select name="dateField" defaultValue={initial.dateField}>
                  {DATE_FIELD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Input type="date" name="dateFrom" defaultValue={initial.dateFrom} />
              <Input type="date" name="dateTo" defaultValue={initial.dateTo} />
            </div>
          </Field>

          <Field label="Super Search">
            <Input name="superSearch" defaultValue={initial.superSearch} />
          </Field>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <Field label="Step Status">
            <button
              type="button"
              onClick={() => setStepStatusModalOpen(true)}
              className="flex h-8 w-full items-center rounded-[3px] border border-border bg-white px-2.5 text-left text-[13px] hover:border-accent"
            >
              {labelsFor(stepStatus, STEP_STATUS_OPTIONS)}
            </button>
          </Field>

          <Field label="Step Outcome">
            <Select name="stepOutcome" defaultValue={initial.stepOutcome}>
              <option value="">&lt;All&gt;</option>
              {outcomeOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Document No.">
            <Input name="documentNo" defaultValue={initial.documentNo} />
          </Field>

          <Field label="Assigned To">
            <Input name="assignedTo" defaultValue={initial.assignedTo} placeholder="— Enter search query here —" />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3 text-[13px]">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="myTasksOnly" value="1" defaultChecked={initial.myTasksOnly} />
          Show my tasks only
        </label>

        <label className="flex items-center gap-1.5">
          Group By
          <div className="w-40">
            <Select name="groupBy" defaultValue={initial.groupBy}>
              {GROUP_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </label>

        <label className="flex items-center gap-1.5">
          Sort by
          <div className="w-40">
            <Select name="sort" defaultValue={initial.sort}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </label>

        <label className="flex items-center gap-1.5">
          Show
          <div className="w-20">
            <Select name="pageSize" defaultValue={initial.pageSize}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          per page
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/workflows" className="rounded-[3px] border border-border bg-white px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-background">
            Clear
          </Link>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </div>
      </div>

      <TransferListModal
        open={workflowStatusModalOpen}
        onClose={() => setWorkflowStatusModalOpen(false)}
        title="Workflow Status"
        availableLabel="Available Workflow Status"
        selectedLabel="Selected Workflow Status"
        options={WORKFLOW_STATUS_OPTIONS}
        initialSelected={workflowStatus}
        onApply={setWorkflowStatus}
      />
      <TransferListModal
        open={stepStatusModalOpen}
        onClose={() => setStepStatusModalOpen(false)}
        title="Step Status"
        availableLabel="Available Step Status"
        selectedLabel="Selected Step Status"
        options={STEP_STATUS_OPTIONS}
        initialSelected={stepStatus}
        onApply={setStepStatus}
      />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
