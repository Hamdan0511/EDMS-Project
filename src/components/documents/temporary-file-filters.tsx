import { Button } from "@/components/ui/button";
import { IconInput, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search } from "@/components/ui/icons";
import Link from "next/link";
import { FILE_TYPE_FILTER_OPTIONS } from "@/lib/files/file-types";

const STATUS_OPTIONS = [
  { value: "TEMPORARY", label: "Temporary" },
  { value: "PROCESSING", label: "Processing" },
  { value: "REGISTERED", label: "Registered" },
];

export function TemporaryFileFilters({
  q,
  status,
  fileType,
  dateFrom,
  dateTo,
}: {
  q: string;
  status: string;
  fileType: string;
  dateFrom: string;
  dateTo: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-3 border-b border-border pb-3">
      <div className="min-w-56 flex-1 max-w-md">
        <label className="mb-1 block text-[11px] font-medium text-text-secondary">Search</label>
        <IconInput
          icon={<Search size={14} />}
          name="q"
          defaultValue={q}
          placeholder="File name or uploaded by…"
        />
      </div>
      <div className="w-40">
        <label className="mb-1 block text-[11px] font-medium text-text-secondary">Status</label>
        <Select name="status" defaultValue={status}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <label className="mb-1 block text-[11px] font-medium text-text-secondary">File Type</label>
        <Select name="fileType" defaultValue={fileType}>
          <option value="">All</option>
          {FILE_TYPE_FILTER_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-36">
        <label className="mb-1 block text-[11px] font-medium text-text-secondary">Date From</label>
        <Input type="date" name="dateFrom" defaultValue={dateFrom} />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-[11px] font-medium text-text-secondary">Date To</label>
        <Input type="date" name="dateTo" defaultValue={dateTo} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary">
          Search
        </Button>
        <Link href="/documents/temporary-files" className="text-[13px] text-brand-700 hover:underline">
          Clear
        </Link>
      </div>
    </div>
  );
}
