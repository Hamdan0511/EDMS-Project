import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ArrowLink({
  href,
  children,
  className = "",
  external,
}: {
  href: string;
  children: string;
  className?: string;
  external?: boolean;
}) {
  const content = (
    <span className={`group inline-flex items-center gap-2 text-[13px] font-medium tracking-wide text-brand-800 ${className}`}>
      {children}
      <ArrowRight size={15} className="transition-transform duration-300 ease-out group-hover:translate-x-1" />
    </span>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
}
