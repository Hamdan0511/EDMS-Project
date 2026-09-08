import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";
import Link from "next/link";
import { DocumentAdvancedSearchModal } from "./document-advanced-search-modal";

export function DocumentsFilters({
  q,
  typeOptions,
  organizationOptions,
}: {
  q: string;
  typeOptions: { id: string; name: string }[];
  organizationOptions: { id: string; name: string }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <div className="min-w-64 max-w-md flex-1">
        <IconInput
          icon={<Search size={14} />}
          name="q"
          defaultValue={q}
          placeholder="Search document no., title, or file name…"
        />
      </div>
      <Button type="submit" variant="primary">
        Search
      </Button>
      <DocumentAdvancedSearchModal typeOptions={typeOptions} organizationOptions={organizationOptions} />
      <Link href="/documents" className="text-[13px] text-brand-700 hover:underline">
        Clear All
      </Link>
    </div>
  );
}
