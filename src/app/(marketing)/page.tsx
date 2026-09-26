import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { ArrowLink } from "@/components/marketing/arrow-link";
import { MarketingButton } from "@/components/marketing/marketing-button";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { CapabilityStrip } from "@/components/marketing/capability-strip";
import { ProjectCard } from "@/components/marketing/project-card";
import { SHANFARI_ASSETS, APP_PREVIEWS } from "@/data/shanfariAssets";
import { SHANFARI_PROJECTS } from "@/data/shanfariProjects";
import { SIGN_IN_HREF } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: "Shanfari Furnishing — Connected Operations" },
  description:
    "Shanfari Furnishing's connected digital workspace — bringing projects, information, communication, HSE and operational workflows together in one place.",
};

export default async function MarketingHomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  const featuredSlugs = ["royal-opera-house-muscat", "bousher-intercity-hotel-muscat", "sultan-qaboos-mosque-in-sohar", "al-bustan-place-hotel-in-muscat"];
  const featured = featuredSlugs
    .map((slug) => SHANFARI_PROJECTS.find((p) => p.slug === slug))
    .filter((p): p is (typeof SHANFARI_PROJECTS)[number] => Boolean(p));

  return (
    <>
      {/* 01 — HERO */}
      <section className="relative overflow-hidden">
        <div className="relative min-h-[640px] w-full lg:min-h-[720px]">
          <Image
            src={SHANFARI_ASSETS.heroLobby.src}
            alt={SHANFARI_ASSETS.heroLobby.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/92 via-background/55 to-background/85 sm:bg-gradient-to-r sm:from-background sm:from-0% sm:via-background/45 sm:via-45% sm:to-transparent sm:to-85%" />

          <Container className="relative flex h-full min-h-[640px] flex-col justify-center py-20 lg:min-h-[720px]">
            <div className="max-w-xl">
              <SectionLabel>A Connected Workspace</SectionLabel>
              <h1 className="mt-6 font-serif text-[42px] leading-[1.08] text-brand-950 sm:text-[54px]">
                Connected Operations.
                <br />
                Built for Shanfari.
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                A unified digital platform connecting projects, information, communication, HSE, quality and operational
                workflows across Shanfari Furnishing.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <MarketingButton href="/platform" variant="primary">
                  Explore Platform
                </MarketingButton>
                <MarketingButton href={SIGN_IN_HREF} variant="secondary">
                  Sign In
                </MarketingButton>
              </div>
            </div>
          </Container>
        </div>
        <Container className="flex items-center gap-3 border-t border-border py-4 text-[11px] uppercase tracking-[0.16em] text-text-muted">
          <span>Royal Opera House Muscat</span>
        </Container>
      </section>

      {/* 02 — PRODUCT INTRODUCTION */}
      <section className="border-t border-border py-24 lg:py-32">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <SectionLabel>The Platform</SectionLabel>
              <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">
                Built Around the Way Your Teams Work
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                Bring people, projects, documents, communication, HSE, quality and operational workflows together in one
                connected environment — built specifically around how Shanfari Furnishing&rsquo;s teams operate.
              </p>
              <div className="mt-8">
                <ArrowLink href="/platform">Discover the Platform</ArrowLink>
              </div>
            </div>
            <BrowserFrame src={APP_PREVIEWS.home.src} alt={APP_PREVIEWS.home.alt} priority />
          </div>
        </Container>
      </section>

      {/* 03 — CORE CAPABILITIES */}
      <section className="border-t border-border py-24 lg:py-32">
        <Container>
          <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <SectionLabel>Core Capabilities</SectionLabel>
              <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">
                Everything You Need. All Connected.
              </h2>
            </div>
          </div>
          <CapabilityStrip />
        </Container>
      </section>

      {/* 04 — FEATURED PLATFORM MODULE (HSE) */}
      <section className="border-t border-border py-24 lg:py-32">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div className="order-2 lg:order-1">
              <BrowserFrame src={APP_PREVIEWS.hse.src} alt={APP_PREVIEWS.hse.alt} />
            </div>
            <div className="order-1 lg:order-2">
              <SectionLabel>Featured Module</SectionLabel>
              <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">
                Report. Assess. Control. Close.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                A complete health &amp; safety workflow — from the moment an observation, incident or hazard is reported,
                through risk assessment and corrective action, to verified closure.
              </p>
              <div className="mt-8">
                <ArrowLink href="/platform">See How HSE Works</ArrowLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 05 — SHANFARI CONNECTION */}
      <section className="relative overflow-hidden border-t border-border bg-brand-950 py-24 text-white lg:py-32">
        <div className="absolute inset-0 opacity-[0.16]">
          <Image
            src={SHANFARI_ASSETS.royalOperaHouseOrganDetail.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <Container className="relative">
          <div className="max-w-xl">
            <SectionLabel>Craftsmanship Meets Modern Operations</SectionLabel>
            <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-white sm:text-[40px]">
              The Same Attention to Detail
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-white/70">
              The precision that defines Shanfari Furnishing&rsquo;s craftsmanship since 1977 is now applied to how the
              organization manages its information, processes and people.
            </p>
            <div className="mt-8">
              <ArrowLink href="/about" className="text-white">
                Our Approach
              </ArrowLink>
            </div>
          </div>
        </Container>
      </section>

      {/* 06 — SELECTED PROJECTS */}
      <section className="border-t border-border py-24 lg:py-32">
        <Container>
          <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <SectionLabel>Selected Projects</SectionLabel>
              <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">
                Iconic Spaces. Lasting Impact.
              </h2>
            </div>
            <ArrowLink href="/projects">View All Projects</ArrowLink>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {featured.map((project, i) => (
              <ProjectCard key={project.slug} project={project} priority={i === 0} />
            ))}
          </div>
        </Container>
      </section>

      {/* 07 — FINAL CTA */}
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
