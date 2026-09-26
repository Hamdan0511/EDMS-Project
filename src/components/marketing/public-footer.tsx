import Link from "next/link";
import { MarketingLogo } from "./marketing-logo";
import { Container } from "./container";
import { MARKETING_NAV, COMPANY_INFO } from "@/lib/site-config";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <Container className="flex flex-col gap-10 py-14">
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-start">
          <div className="max-w-sm">
            <MarketingLogo height={26} />
            <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
              A connected digital workspace bringing Shanfari Furnishing&rsquo;s projects, information, communication and
              operations together.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-10 gap-y-3" aria-label="Footer">
            {MARKETING_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-[13px] font-medium text-text-secondary hover:text-brand-800">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="text-[13px] leading-relaxed text-text-secondary">
            <p className="font-medium text-text-primary">{COMPANY_INFO.legalName}</p>
            <p className="mt-1">{COMPANY_INFO.address}</p>
            <a href={`mailto:${COMPANY_INFO.email}`} className="mt-1 inline-block hover:text-brand-800">
              {COMPANY_INFO.email}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-[12px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY_INFO.legalName}. All rights reserved.</p>
          <p>Established {COMPANY_INFO.founded}, Sultanate of Oman.</p>
        </div>
      </Container>
    </footer>
  );
}
