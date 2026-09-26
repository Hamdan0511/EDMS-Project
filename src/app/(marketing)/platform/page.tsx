import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { MarketingButton } from "@/components/marketing/marketing-button";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { PlatformModuleRow } from "@/components/marketing/platform-module-row";
import { PLATFORM_CAPABILITIES } from "@/data/platformCapabilities";
import { APP_PREVIEWS } from "@/data/shanfariAssets";
import { SIGN_IN_HREF } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "One connected workspace for Shanfari Furnishing's projects, information, communication, HSE and operational workflows.",
};

export default function PlatformPage() {
  return (
    <>
      <section className="border-b border-border py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <SectionLabel>Digital Platform</SectionLabel>
              <h1 className="mt-6 font-serif text-[40px] leading-[1.1] text-brand-950 sm:text-[52px]">
                One Platform.
                <br />
                Every Process.
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                A connected workspace for projects, information, communication, HSE, quality and operational workflows —
                built specifically around how Shanfari Furnishing&rsquo;s teams work.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <MarketingButton href="#modules" arrow={false} variant="primary">
                  Explore Modules
                </MarketingButton>
                <MarketingButton href={SIGN_IN_HREF} variant="secondary">
                  Sign In
                </MarketingButton>
              </div>
            </div>
            <BrowserFrame src={APP_PREVIEWS.home.src} alt={APP_PREVIEWS.home.alt} priority />
          </div>
        </Container>
      </section>

      <section id="modules" className="py-20 lg:py-28">
        <Container>
          <div className="mb-4">
            <SectionLabel>Platform Modules</SectionLabel>
            <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">
              Powering Your Operations
            </h2>
          </div>
          <div>
            {PLATFORM_CAPABILITIES.map((capability) => (
              <PlatformModuleRow key={capability.number} capability={capability} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-brand-900 py-20 text-white">
        <Container className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-serif text-[28px] leading-tight text-white sm:text-[34px]">Ready to Enter Your Workspace?</h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/70">
              Access the connected environment built to bring your projects, information and operations together.
            </p>
          </div>
          <MarketingButton href={SIGN_IN_HREF} variant="inverse">
            Sign In
          </MarketingButton>
        </Container>
      </section>
    </>
  );
}
