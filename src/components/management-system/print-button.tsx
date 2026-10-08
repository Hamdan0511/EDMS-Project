"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "@/components/ui/icons";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer size={13} />
      Print
    </Button>
  );
}
