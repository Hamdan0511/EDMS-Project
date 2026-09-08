"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "@/components/ui/icons";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      <Printer size={14} />
      Print
    </Button>
  );
}
