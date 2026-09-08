"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "@/components/ui/icons";

type Option = { id: string; value: string };

/**
 * Aconex-style "Select Attributes" picker: an Available/Selected pair per
 * attribute slot. Each slot on Mail (attribute1/attribute2) stores a single
 * string, so selection here is single-value — picking an available value
 * replaces whatever was previously selected for that slot, matching "only
 * one value selectable" from the reference screenshots.
 */
export function SelectAttributesModal({
  open,
  onClose,
  mailTypeId,
  slots,
  canAddValues,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  mailTypeId: string;
  slots: { slot: 1 | 2; label: string; currentValue: string }[];
  canAddValues: boolean;
  onConfirm: (values: Record<1 | 2, string>) => void;
}) {
  const [options, setOptions] = useState<Record<1 | 2, Option[]>>({ 1: [], 2: [] });
  const [selectedValues, setSelectedValues] = useState<Record<1 | 2, string>>({ 1: "", 2: "" });
  const [newValue, setNewValue] = useState<Record<1 | 2, string>>({ 1: "", 2: "" });
  const [filter, setFilter] = useState<Record<1 | 2, string>>({ 1: "", 2: "" });

  // Resets the picker's working state from the parent's current
  // attribute values and refetches the option lists each time the modal is
  // opened — intentional use of setState in an effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setSelectedValues({
      1: slots.find((s) => s.slot === 1)?.currentValue ?? "",
      2: slots.find((s) => s.slot === 2)?.currentValue ?? "",
    });
    for (const s of slots) {
      fetch(`/api/mail/types/${mailTypeId}/attribute-options?slot=${s.slot}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((opts: Option[]) => setOptions((prev) => ({ ...prev, [s.slot]: opts })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mailTypeId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function addNewValue(slot: 1 | 2) {
    const value = newValue[slot].trim();
    if (!value) return;
    const res = await fetch(`/api/mail/types/${mailTypeId}/attribute-options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, value }),
    });
    if (res.ok) {
      const option = await res.json();
      setOptions((prev) => ({
        ...prev,
        [slot]: prev[slot].some((o) => o.value === option.value) ? prev[slot] : [...prev[slot], option],
      }));
      setSelectedValues((prev) => ({ ...prev, [slot]: option.value }));
      setNewValue((prev) => ({ ...prev, [slot]: "" }));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Select Attributes" width="max-w-2xl">
      <div className="flex flex-col gap-6">
        {slots.map(({ slot, label }) => {
          const available = options[slot].filter(
            (o) =>
              o.value !== selectedValues[slot] &&
              o.value.toLowerCase().includes(filter[slot].toLowerCase()),
          );
          return (
            <div key={slot}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {label}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] text-text-muted">Available {label}</label>
                  <Input
                    placeholder="Filter…"
                    value={filter[slot]}
                    onChange={(e) => setFilter((prev) => ({ ...prev, [slot]: e.target.value }))}
                    className="mb-1.5"
                  />
                  <div className="h-32 overflow-y-auto rounded-[3px] border border-border">
                    {available.length === 0 && (
                      <p className="p-2 text-xs text-text-muted">No values available.</p>
                    )}
                    {available.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSelectedValues((prev) => ({ ...prev, [slot]: o.value }))}
                        className="block w-full border-b border-border px-2 py-1.5 text-left text-[13px] last:border-b-0 hover:bg-brand-50"
                      >
                        {o.value}
                      </button>
                    ))}
                  </div>
                  {canAddValues && (
                    <div className="mt-1.5 flex gap-1.5">
                      <Input
                        placeholder="Add new value…"
                        value={newValue[slot]}
                        onChange={(e) => setNewValue((prev) => ({ ...prev, [slot]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addNewValue(slot);
                          }
                        }}
                      />
                      <Button type="button" variant="secondary" size="sm" onClick={() => addNewValue(slot)}>
                        <Plus size={13} />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-text-muted">Selected {label}</label>
                  <div className="h-32 overflow-y-auto rounded-[3px] border border-border">
                    {selectedValues[slot] ? (
                      <button
                        type="button"
                        onClick={() => setSelectedValues((prev) => ({ ...prev, [slot]: "" }))}
                        className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[13px] hover:bg-brand-50"
                        title="Click to remove"
                      >
                        {selectedValues[slot]}
                        <span className="text-text-muted">×</span>
                      </button>
                    ) : (
                      <p className="p-2 text-xs text-text-muted">Nothing selected.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onConfirm(selectedValues);
              onClose();
            }}
          >
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );
}
