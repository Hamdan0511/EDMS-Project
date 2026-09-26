import Image from "next/image";
import type { PlatformCapability } from "@/data/platformCapabilities";

export function PlatformModuleRow({ capability }: { capability: PlatformCapability }) {
  return (
    <div className="grid grid-cols-1 gap-8 border-t border-border py-10 first:border-t-0 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16">
      <div>
        <span className="font-serif text-[15px] text-brand-400">{capability.number}</span>
        <h3 className="mt-2 font-serif text-[26px] leading-tight text-brand-950">{capability.title}</h3>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-text-secondary">{capability.description}</p>
        <ul className="mt-5 flex flex-col gap-1.5">
          {capability.features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-[13px] text-text-secondary">
              <span className="h-1 w-1 shrink-0 rounded-full bg-brand-500" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3px] border border-border-strong bg-white shadow-[0_20px_50px_-24px_rgba(28,23,18,0.3)]">
        <Image
          src={capability.preview.src}
          alt={capability.preview.alt}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover object-top"
          unoptimized
        />
      </div>
    </div>
  );
}
