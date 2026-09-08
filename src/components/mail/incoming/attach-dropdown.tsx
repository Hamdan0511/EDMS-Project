"use client";

import { Dropdown } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { Paperclip, ChevronDown } from "@/components/ui/icons";

export function AttachDropdown({
  onDocument,
  onProjectMail,
  onLocalFile,
}: {
  onDocument: () => void;
  onProjectMail: () => void;
  onLocalFile: () => void;
}) {
  return (
    <Dropdown
      align="left"
      trigger={({ toggle }) => (
        <Button type="button" variant="secondary" onClick={toggle}>
          <Paperclip size={14} />
          Attach
          <ChevronDown size={12} />
        </Button>
      )}
    >
      {(close) => (
        <div className="flex flex-col py-1">
          <button
            type="button"
            onClick={() => {
              onDocument();
              close();
            }}
            className="px-3 py-1.5 text-left text-[13px] text-text-primary hover:bg-brand-50"
          >
            Document
          </button>
          <button
            type="button"
            onClick={() => {
              onProjectMail();
              close();
            }}
            className="px-3 py-1.5 text-left text-[13px] text-text-primary hover:bg-brand-50"
          >
            Project Mail
          </button>
          <button
            type="button"
            onClick={() => {
              onLocalFile();
              close();
            }}
            className="px-3 py-1.5 text-left text-[13px] text-text-primary hover:bg-brand-50"
          >
            Local File
          </button>
        </div>
      )}
    </Dropdown>
  );
}
