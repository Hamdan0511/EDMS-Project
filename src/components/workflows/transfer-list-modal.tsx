"use client";

import { useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export type TransferOption = { value: string; label: string };

/** Generic Aconex-style "transfer list" picker: two listboxes (Available /
 * Selected) with >> and << buttons to move highlighted entries between
 * them — used for both the Workflow Status and Step Status search fields. */
export function TransferListModal({
  open,
  onClose,
  title,
  availableLabel,
  selectedLabel,
  options,
  initialSelected,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  availableLabel: string;
  selectedLabel: string;
  options: TransferOption[];
  initialSelected: string[];
  onApply: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState("");
  const availableRef = useRef<HTMLSelectElement>(null);
  const selectedRef = useRef<HTMLSelectElement>(null);

  const available = useMemo(
    () =>
      options.filter(
        (o) => !selected.includes(o.value) && o.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [options, selected, query],
  );
  const selectedOptions = useMemo(() => options.filter((o) => selected.includes(o.value)), [options, selected]);

  function moveToSelected() {
    const values = Array.from(availableRef.current?.selectedOptions ?? []).map((o) => o.value);
    if (values.length === 0) return;
    setSelected((prev) => [...prev, ...values]);
  }

  function moveToAvailable() {
    const values = Array.from(selectedRef.current?.selectedOptions ?? []).map((o) => o.value);
    if (values.length === 0) return;
    setSelected((prev) => prev.filter((v) => !values.includes(v)));
  }

  function close() {
    setQuery("");
    onClose();
  }

  function apply() {
    onApply(selected);
    close();
  }

  return (
    <Modal open={open} onClose={close} title={title} width="max-w-xl">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">{availableLabel}</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="mb-1 h-7 w-full rounded-[3px] border border-border bg-white px-2 text-[12px] outline-none focus:border-accent"
            />
            <select
              ref={availableRef}
              multiple
              size={8}
              className="w-full rounded-[3px] border border-border bg-white text-[13px]"
            >
              {available.map((o) => (
                <option key={o.value} value={o.value} className="px-2 py-1">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={moveToSelected} aria-label="Move to selected">
              &gt;&gt;
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={moveToAvailable} aria-label="Move to available">
              &lt;&lt;
            </Button>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">{selectedLabel}</p>
            <div className="mb-1 h-7" />
            <select
              ref={selectedRef}
              multiple
              size={8}
              className="w-full rounded-[3px] border border-border bg-white text-[13px]"
            >
              {selectedOptions.map((o) => (
                <option key={o.value} value={o.value} className="px-2 py-1">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="primary" onClick={apply}>
            OK
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
