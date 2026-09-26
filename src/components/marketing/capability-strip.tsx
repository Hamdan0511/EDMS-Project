import Link from "next/link";
import { PLATFORM_CAPABILITIES } from "@/data/platformCapabilities";

/** A restrained, editorial row of the real platform modules — numbered
 * labels rather than generic icon cards, each linking through to its full
 * treatment on /platform. */
export function CapabilityStrip() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
      {PLATFORM_CAPABILITIES.map((c) => (
        <Link
          key={c.number}
          href="/platform"
          className="group flex flex-col gap-3 bg-white px-5 py-7 transition-colors hover:bg-brand-50"
        >
          <span className="font-serif text-lg text-brand-400">{c.number}</span>
          <span className="text-[13px] font-medium leading-snug text-text-primary">{c.title}</span>
          <span className="text-[12px] leading-snug text-text-secondary">{c.tagline}</span>
        </Link>
      ))}
    </div>
  );
}
