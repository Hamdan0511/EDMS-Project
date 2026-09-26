import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { ArrowLink } from "@/components/marketing/arrow-link";
import { ProjectCard } from "@/components/marketing/project-card";
import { SHANFARI_PROJECTS } from "@/data/shanfariProjects";

export function generateStaticParams() {
  return SHANFARI_PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = SHANFARI_PROJECTS.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = SHANFARI_PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const related = SHANFARI_PROJECTS.filter((p) => p.category === project.category && p.slug !== project.slug).slice(0, 3);

  return (
    <>
      <section className="relative">
        <div className="relative aspect-[16/9] w-full lg:aspect-[21/9]">
          <Image src={project.image.src} alt={project.image.alt} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-brand-950/10 to-transparent" />
          <Container className="absolute inset-x-0 bottom-0 pb-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/80">{project.category}</p>
            <h1 className="mt-3 font-serif text-[34px] leading-tight text-white sm:text-[48px]">{project.name}</h1>
          </Container>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <SectionLabel>Project Details</SectionLabel>
              <dl className="mt-6 flex flex-col gap-4 text-[14px]">
                <div className="flex justify-between border-b border-border pb-3">
                  <dt className="text-text-muted">Location</dt>
                  <dd className="text-text-primary">{project.location}</dd>
                </div>
                {project.completionYear && (
                  <div className="flex justify-between border-b border-border pb-3">
                    <dt className="text-text-muted">Completion</dt>
                    <dd className="text-text-primary">{project.completionYear}</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-border pb-3">
                  <dt className="text-text-muted">Category</dt>
                  <dd className="text-text-primary">{project.category}</dd>
                </div>
                {project.client && (
                  <div className="flex justify-between border-b border-border pb-3">
                    <dt className="text-text-muted">Client</dt>
                    <dd className="text-text-primary">{project.client}</dd>
                  </div>
                )}
                {project.designConsultant && (
                  <div className="flex justify-between gap-4 border-b border-border pb-3">
                    <dt className="shrink-0 text-text-muted">Design Consultant</dt>
                    <dd className="text-right text-text-primary">{project.designConsultant}</dd>
                  </div>
                )}
                {project.projectCost && (
                  <div className="flex justify-between border-b border-border pb-3">
                    <dt className="text-text-muted">Project Value</dt>
                    <dd className="text-text-primary">{project.projectCost}</dd>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 border-b border-border pb-3">
                  <dt className="text-text-muted">Services Provided</dt>
                  <dd className="flex flex-wrap gap-2 pt-1">
                    {project.services.map((s) => (
                      <span key={s} className="rounded-[2px] border border-border-strong px-2.5 py-1 text-[12px] text-text-secondary">
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="mt-8">
                <ArrowLink href="/projects">Back to Projects</ArrowLink>
              </div>
            </div>

            <div>
              <SectionLabel>Overview</SectionLabel>
              <p className="mt-6 text-[16px] leading-relaxed text-text-secondary">{project.description}</p>
            </div>
          </div>
        </Container>
      </section>

      {project.gallery.length > 0 && (
        <section className="border-t border-border py-16 lg:py-24">
          <Container>
            <SectionLabel>Gallery</SectionLabel>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.gallery.map((img) => (
                <div key={img.src} className="relative aspect-[4/3] w-full overflow-hidden bg-brand-100">
                  <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-border py-16 lg:py-24">
          <Container>
            <div className="mb-10 flex items-end justify-between">
              <div>
                <SectionLabel>Related Projects</SectionLabel>
                <h2 className="mt-6 font-serif text-[28px] leading-tight text-brand-950 sm:text-[32px]">More {project.category} Work</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
              {related.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="border-t border-border py-16">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-text-muted">Interested in a similar project?</p>
          <Link href="/contact" className="text-[13px] font-medium tracking-wide text-brand-800 hover:underline">
            Start a Project Enquiry →
          </Link>
        </Container>
      </section>
    </>
  );
}
