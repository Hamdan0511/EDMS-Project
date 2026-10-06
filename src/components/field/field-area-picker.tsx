import { Select } from "@/components/ui/select";

export type FieldAreaOption = { id: string; name: string; children: FieldAreaOption[] };

function flatten(nodes: FieldAreaOption[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${"— ".repeat(depth)}${n.name}` },
    ...flatten(n.children, depth + 1),
  ]);
}

/** Hierarchical location select built from the real FieldArea tree —
 * indentation communicates depth (Building > Floor > Zone > Room). */
export function FieldAreaPicker({
  tree,
  name = "areaId",
  value,
  defaultValue,
  onChange,
  className,
}: {
  tree: FieldAreaOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const options = flatten(tree);
  return (
    <Select
      name={name}
      {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? "" })}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={className}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </Select>
  );
}
