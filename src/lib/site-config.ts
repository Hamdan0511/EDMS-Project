/** Single source of truth for the public site's link into the actual
 * application. The authenticated app lives in this same Next.js project,
 * so this is just "/login" today — but every Sign In control reads it from
 * here, not a hardcoded string, so the two can be pointed at different
 * origins later without hunting through components. */
export const SIGN_IN_HREF = "/login";

export const SITE_NAME = "Shanfari Furnishing";

/** Verified official company details only — sourced from
 * https://shanfarifurnishing.com/. Never invent additional entries here. */
export const COMPANY_INFO = {
  legalName: "Shanfari Trading & Furnishing Co. LLC",
  founded: 1977,
  address: "P.O. Box 645, Azaiba, Postal Code 130, Sultanate of Oman",
  email: "info@shanfarifurnishing.com",
  sourceUrl: "https://shanfarifurnishing.com/",
};

export const MARKETING_NAV = [
  { label: "Home", href: "/" },
  { label: "Platform", href: "/platform" },
  { label: "Services", href: "/services" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
