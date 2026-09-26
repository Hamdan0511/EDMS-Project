import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

const BASE =
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap px-6 py-3 text-[13px] font-medium tracking-wide transition-colors duration-200";

const VARIANTS = {
  primary: "bg-brand-900 text-white hover:bg-brand-800",
  secondary: "border border-border-strong bg-transparent text-text-primary hover:bg-brand-50",
  inverse: "bg-white text-brand-900 hover:bg-brand-50",
  ghost: "text-text-primary hover:text-brand-700",
};

export function MarketingButton({
  href,
  children,
  variant = "primary",
  arrow = true,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
      {arrow && <ArrowRight size={15} className="transition-transform duration-300 ease-out group-hover:translate-x-1" />}
    </Link>
  );
}
