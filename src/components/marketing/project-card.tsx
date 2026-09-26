import Image from "next/image";
import Link from "next/link";
import type { ShanfariProject } from "@/data/shanfariProjects";

export function ProjectCard({ project, priority = false }: { project: ShanfariProject; priority?: boolean }) {
  return (
    <Link href={`/projects/${project.slug}`} className="group flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-100">
        <Image
          src={project.image.src}
          alt={project.image.alt}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          priority={priority}
        />
      </div>
      <div className="flex items-start justify-between gap-2 pt-4">
        <div>
          <p className="text-[14px] font-medium leading-snug text-text-primary">{project.name}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-brand-600">{project.category}</p>
        </div>
      </div>
    </Link>
  );
}
