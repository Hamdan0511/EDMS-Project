/**
 * Centralized catalogue of every real Shanfari Furnishing image used on the
 * public site. Every file here was downloaded from the official company
 * site (see `source` on each entry) — nothing in this catalogue is
 * AI-generated or a stand-in for a real project. Curated deliberately: a
 * substantial but bounded selection (roughly 3-5 images per featured
 * project) rather than the full official image library.
 */
export type ShanfariImage = {
  src: string;
  alt: string;
  project?: string;
  location?: string;
  category: "branding" | "hero" | "project" | "craftsmanship" | "about";
  source: string;
};

const OFFICIAL_SOURCE = "https://shanfarifurnishing.com/";
const P = "/images/shanfari/projects";

export const SHANFARI_ASSETS = {
  logoGold: {
    src: "/images/shanfari/branding/shanfari-logo-gold.png",
    alt: "Shanfari Furnishing",
    category: "branding",
    source: OFFICIAL_SOURCE,
  },
  logoWhite: {
    src: "/images/shanfari/branding/shanfari-logo-white.png",
    alt: "Shanfari Furnishing",
    category: "branding",
    source: OFFICIAL_SOURCE,
  },
  heroLobby: {
    src: `${P}/royal-opera-house-lobby-entry.jpg`,
    alt: "Grand lobby staircase with carved timber balustrades at the Royal Opera House Muscat",
    project: "Royal Opera House Muscat",
    location: "Muscat, Oman",
    category: "hero",
    source: "https://shanfarifurnishing.com/projects/royal-opera-house-muscat/",
  },
  artisanCarvingDetail: {
    src: "/images/shanfari/craftsmanship/artisan-carving-detail.jpg",
    alt: "Shanfari artisan hand-carving an ornate timber panel",
    category: "craftsmanship",
    source: OFFICIAL_SOURCE,
  },
  artisanWorkshopBanner: {
    src: "/images/shanfari/about/artisan-workshop-banner.jpg",
    alt: "Close-up of a Shanfari artisan carving a timber panel in the workshop",
    category: "about",
    source: OFFICIAL_SOURCE,
  },
  royalOperaHouseOrganDetail: {
    src: `${P}/royal-opera-house-pipe-organ.jpg`,
    alt: "Carved timber organ enclosure detail at the Royal Opera House Muscat",
    project: "Royal Opera House Muscat",
    location: "Muscat, Oman",
    category: "craftsmanship",
    source: "https://shanfarifurnishing.com/projects/royal-opera-house-muscat/",
  },
} as const satisfies Record<string, ShanfariImage>;

/** Real screenshots captured directly from the actual, working application
 * (not mockups) — used on the Home and Platform pages as honest product
 * previews. Re-generate via `.scratch/capture-app-screens.mjs` if the UI
 * changes materially. */
export const APP_PREVIEWS = {
  home: { src: "/images/app/home.png", alt: "The Shanfari platform home screen showing real project document and mail summaries" },
  documents: { src: "/images/app/documents-drawings.png", alt: "The real Drawings register inside the Shanfari platform" },
  mail: { src: "/images/app/mail.png", alt: "The real Mail register inside the Shanfari platform" },
  hse: { src: "/images/app/hse-dashboard.png", alt: "The real Health & Safety dashboard inside the Shanfari platform" },
  workflows: { src: "/images/app/workflows.png", alt: "The real Workflows search screen inside the Shanfari platform" },
  directory: { src: "/images/app/directory.png", alt: "The real Directory and access control screen inside the Shanfari platform" },
} as const;
