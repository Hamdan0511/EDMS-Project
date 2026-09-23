import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DirectorySearchForm({
  tab,
  initial,
}: {
  tab: "project" | "global";
  initial: {
    organizationName: string;
    name: string;
    familyName: string;
    jobTitle: string;
    division: string;
    userOrGroup: string;
    accountType: string;
  };
}) {
  const radioClass = "flex items-center gap-1 text-[13px] text-text-primary";
  return (
    <form action="/directory" method="GET" className="rounded-[3px] border border-border bg-white">
      <input type="hidden" name="tab" value={tab} />
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 p-4 text-[13px]">
        <label className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">Organization Name</span>
          <Input name="organizationName" defaultValue={initial.organizationName} />
        </label>
        <label className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">Division</span>
          <Input name="division" defaultValue={initial.division} />
        </label>

        <label className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">Given / Group Name</span>
          <Input name="name" defaultValue={initial.name} />
        </label>
        <label className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">Family Name</span>
          <Input name="familyName" defaultValue={initial.familyName} />
        </label>

        <label className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">Job Title</span>
          <Input name="jobTitle" defaultValue={initial.jobTitle} />
        </label>
        <div className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">User / Group</span>
          <div className="flex items-center gap-4">
            {[
              { value: "all", label: "All" },
              { value: "users", label: "Users" },
              { value: "groups", label: "Groups" },
            ].map((o) => (
              <label key={o.value} className={radioClass}>
                <input
                  type="radio"
                  name="userOrGroup"
                  value={o.value}
                  defaultChecked={(initial.userOrGroup || "all") === o.value}
                  className="h-3.5 w-3.5 accent-brand-700"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div />
        <div className="grid grid-cols-[140px_1fr] items-center gap-2">
          <span className="text-text-secondary">Account Type</span>
          <div className="flex items-center gap-4">
            {[
              { value: "all", label: "All" },
              { value: "full", label: "Full user" },
              { value: "guest", label: "Guest user" },
            ].map((o) => (
              <label key={o.value} className={radioClass}>
                <input
                  type="radio"
                  name="accountType"
                  value={o.value}
                  defaultChecked={(initial.accountType || "all") === o.value}
                  className="h-3.5 w-3.5 accent-brand-700"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-border px-4 py-3">
        <Button type="submit" variant="primary">
          Search
        </Button>
      </div>
    </form>
  );
}
