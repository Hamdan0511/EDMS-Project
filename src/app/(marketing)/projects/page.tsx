import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";
import { SectionLabel } from "@/components/marketing/section-label";
import { ProjectCard } from "@/components/marketing/project-card";
import { SHANFARI_PROJECTS, type ShanfariProject } from "@/data/shanfariProjects";

export const metadata: Metadata = {
  title: "Projects",
  description: "A curated selection of Shanfari Furnishing's landmark cultural, hospitality, religious and residential projects.",
};

const CATEGORIES: (ShanfariProject["category"] | "All")[] = ["All", "Cultural", "Hospitality", "Religious", "Residential"];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const active = CATEGORIES.includes(params.category as never) ? (params.category as (typeof CATEGORIES)[number]) : "All";
  const projects = active === "All" ? SHANFARI_PROJECTS : SHANFARI_PROJECTS.filter((p) => p.category === active);

  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="mb-10 max-w-xl">
          <SectionLabel>Our Projects</SectionLabel>
          <h1 className="mt-6 font-serif text-[36px] leading-[1.15] text-brand-950 sm:text-[48px]">
            Landmark Spaces. Lasting Impressions.
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-text-secondary">
            From cultural landmarks to hospitality destinations and private residences, our work reflects a commitment to
            precision, craftsmanship and design integrity.
          </p>
        </div>

        <nav className="mb-12 flex flex-wrap gap-2" aria-label="Filter projects by category">
          {CATEGORIES.map((cat) => {
            const href = cat === "All" ? "/projects" : `/projects?category=${cat}`;
            const isActive = cat === active;
            return (
              <Link
                key={cat}
                href={href}
                className={`border px-4 py-2 text-[12px] font-medium uppercase tracking-wide transition-colors ${
                  isActive
                    ? "border-brand-900 bg-brand-900 text-white"
                    : "border-border-strong text-text-secondary hover:border-brand-600 hover:text-brand-800"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </nav>

        <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} priority={i < 3} />
          ))}
        </div>
      </Container>
    </section>
  );
}
