import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { ArrowLink } from "@/components/marketing/arrow-link";
import { SHANFARI_ASSETS } from "@/data/shanfariAssets";
import { COMPANY_INFO } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description: "Shanfari Furnishing — established 1977, specialising in woodworking, interiors and bespoke furniture in Oman.",
};

const APPROACH_STEPS = [
  { number: "01", title: "Concept" },
  { number: "02", title: "Design" },
  { number: "03", title: "Development" },
  { number: "04", title: "Execution" },
  { number: "05", title: "Delivery" },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <SectionLabel>About Us</SectionLabel>
              <h1 className="mt-6 font-serif text-[36px] leading-[1.15] text-brand-950 sm:text-[48px]">
                A Legacy of Craftsmanship
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                {COMPANY_INFO.legalName}, established in {COMPANY_INFO.founded}, has built a strong reputation in
                specialized woodworking, interior furniture and interior fit-outs across Oman.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src={SHANFARI_ASSETS.artisanCarvingDetail.src}
                alt={SHANFARI_ASSETS.artisanCarvingDetail.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/shanfari/projects/bousher-villa-01.jpg"
                alt="Nine-metre timber pergola with outdoor furniture at the Bousher Private Villa"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <SectionLabel>Our Heritage</SectionLabel>
              <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">Since {COMPANY_INFO.founded}</h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                With a commitment to quality, design and precision, Shanfari Furnishing has contributed to some of the
                most distinguished landmarks and projects in the region — combining traditional craftsmanship with modern
                capabilities.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-20 lg:py-28">
        <Container>
          <div className="mb-14 max-w-xl">
            <SectionLabel>Our Approach</SectionLabel>
            <h2 className="mt-6 font-serif text-[32px] leading-[1.15] text-brand-950 sm:text-[40px]">
              From Vision to Exceptional Spaces
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 border-y border-border py-10 sm:grid-cols-5">
            {APPROACH_STEPS.map((step) => (
              <div key={step.number} className="flex flex-col gap-3">
                <span className="font-serif text-lg text-brand-400">{step.number}</span>
                <span className="text-[14px] font-medium text-text-primary">{step.title}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden border-t border-border bg-brand-950 py-20 text-white lg:py-28">
        <div className="absolute inset-0 opacity-[0.14]">
          <Image src={SHANFARI_ASSETS.artisanWorkshopBanner.src} alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <Container className="relative max-w-xl">
          <SectionLabel>From Craftsmanship to Connected Operations</SectionLabel>
          <h2 className="mt-6 font-serif text-[30px] leading-[1.2] text-white sm:text-[36px]">
            Our Digital Platform Brings the Same Precision to How We Work
          </h2>
          <p className="mt-6 text-[15px] leading-relaxed text-white/70">
            The same attention to detail that defines Shanfari Furnishing&rsquo;s craftsmanship is now applied to how the
            organization coordinates its projects, information and operational processes.
          </p>
          <div className="mt-8">
            <ArrowLink href="/platform" className="text-white">
              Explore the Platform
            </ArrowLink>
          </div>
        </Container>
      </section>
    </>
  );
}
