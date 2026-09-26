import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { ArrowLink } from "@/components/marketing/arrow-link";
import { MarketingButton } from "@/components/marketing/marketing-button";
import { SHANFARI_SERVICES, SHANFARI_PROJECTS } from "@/data/shanfariProjects";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Shanfari Furnishing's interior design, interior furniture, interior fit-out and exhibition set works services.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-border py-20 lg:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <SectionLabel>Our Services</SectionLabel>
              <h1 className="mt-6 font-serif text-[36px] leading-[1.15] text-brand-950 sm:text-[48px]">
                Shaping Spaces with Purpose
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-text-secondary">
                We deliver tailored interior solutions that combine design expertise, craftsmanship and precision — from
                bespoke joinery to complete interior fit-outs.
              </p>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src="/images/shanfari/projects/al-bustan-palace-01.jpg"
                alt="Grand lobby seating at Al Bustan Palace Hotel"
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
          <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {SHANFARI_SERVICES.map((service) => (
              <div key={service.number} className="flex flex-col gap-5 p-8 lg:p-12">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-100">
                  <Image
                    src={service.image.src}
                    alt={service.image.alt}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <span className="font-serif text-[15px] text-brand-400">{service.number}</span>
                <h2 className="font-serif text-[24px] leading-tight text-brand-950">{service.title}</h2>
                <p className="text-[14px] leading-relaxed text-text-secondary">{service.description}</p>
                {(() => {
                  const relatedProject = SHANFARI_PROJECTS.find((p) => p.slug === service.relatedProjectSlug);
                  return relatedProject ? (
                    <ArrowLink href={`/projects/${relatedProject.slug}`}>{`See it in ${relatedProject.name}`}</ArrowLink>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-brand-900 py-20 text-white">
        <Container className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-serif text-[28px] leading-tight text-white sm:text-[34px]">Have a Project in Mind?</h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/70">
              Share your requirements and vision with our team — we&rsquo;d be delighted to discuss how we can bring your
              project to life.
            </p>
          </div>
          <MarketingButton href="/contact" variant="inverse">
            Get in Touch
          </MarketingButton>
        </Container>
      </section>
    </>
  );
}
