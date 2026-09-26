import type { ShanfariImage } from "./shanfariAssets";

const P = "/images/shanfari/projects";

/**
 * Verified project data sourced directly from Shanfari Furnishing's
 * official project portfolio (https://shanfarifurnishing.com/projects/ and
 * each project's own detail page). Costs, clients and design consultants
 * are included only where the official site itself publishes them — never
 * estimated or invented.
 */
export type ShanfariProject = {
  slug: string;
  name: string;
  location: string;
  category: "Cultural" | "Hospitality" | "Religious" | "Residential";
  completionYear?: number;
  client?: string;
  designConsultant?: string;
  projectCost?: string;
  summary: string;
  description: string;
  services: string[];
  image: ShanfariImage;
  gallery: { src: string; alt: string }[];
  sourceUrl: string;
};

export const SHANFARI_PROJECTS: ShanfariProject[] = [
  {
    slug: "royal-opera-house-muscat",
    name: "Royal Opera House Muscat",
    location: "Muscat, Oman",
    category: "Cultural",
    completionYear: 2011,
    client: "Royal Court of Affairs",
    designConsultant: "WATG Architecture; Royal Court of Affairs Interiors",
    projectCost: "OMR 4.5 M",
    summary: "Specialist gypsum and joinery works for one of Oman's most recognised cultural landmarks.",
    description:
      "Shanfari Furnishing carried out specialist gypsum and joinery works for the Royal Opera House Muscat — the foremost arts and culture institution in the Sultanate, commissioned by Sultan Qaboos bin Said al Said. The scope included auditorium seating, furniture, the organ enclosure, and the reverberation chamber.",
    services: ["Interior Fit Outs", "Interior Furniture"],
    image: { src: `${P}/royal-opera-house-01.jpg`, alt: "Auditorium seating, orchestra and organ enclosure at the Royal Opera House Muscat", category: "project", source: "https://shanfarifurnishing.com/projects/royal-opera-house-muscat/" },
    gallery: [
      { src: `${P}/royal-opera-house-lobby-entry.jpg`, alt: "Grand lobby staircase with carved timber balustrades" },
      { src: `${P}/royal-opera-house-detail-02.jpg`, alt: "Carved timber archway detail" },
      { src: `${P}/royal-opera-house-pipe-organ.jpg`, alt: "Carved timber organ enclosure detail" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/royal-opera-house-muscat/",
  },
  {
    slug: "rohm-exhibition-musical-arts-muscat",
    name: "ROHM Exhibition of Royal Arts",
    location: "Muscat, Oman",
    category: "Cultural",
    completionYear: 2019,
    designConsultant: "Unusual Projects",
    projectCost: "OMR 90,000",
    summary: "Wooden panels and museum furnishings for the \"Oman and the World: A Musical Journey\" exhibition.",
    description:
      "For the Royal Opera House Muscat's \"Oman and the World: A Musical Journey\" exhibition, Shanfari Furnishing produced wooden panels and museum furnishings blending contemporary design with tradition — functional elements that double as artistic focal points throughout the exhibition experience.",
    services: ["Interior Fit Outs", "Exhibition Set Works"],
    image: { src: `${P}/rohm-exhibition-02.jpg`, alt: "Interactive circular exhibit table inside the ROHM Exhibition of Royal Arts", category: "project", source: "https://shanfarifurnishing.com/projects/rohm-exhibition-musical-arts-muscat/" },
    gallery: [
      { src: `${P}/rohm-exhibition-01.jpg`, alt: "Museum display panel with Arabic and English signage" },
      { src: `${P}/rohm-exhibition-03.jpg`, alt: "Exhibition gallery joinery and display casework" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/rohm-exhibition-musical-arts-muscat/",
  },
  {
    slug: "sultan-qaboos-mosque-in-sohar",
    name: "Sultan Qaboos Mosque",
    location: "Sohar, Oman",
    category: "Religious",
    completionYear: 2016,
    client: "Royal Court of Affairs",
    designConsultant: "Royal Court of Affairs Central Design Office",
    projectCost: "OMR 1,156,693",
    summary: "Joinery works across a 180,000 sqm complex accommodating over 5,500 worshippers.",
    description:
      "Shanfari Furnishing undertook joinery works across the Sultan Qaboos Mosque in Sohar — a complex spanning over 180,000 square metres and accommodating more than 5,500 worshippers across its gardens, courtyard and prayer hall, with design influences drawn from the Bibi Khanum Mosque tradition.",
    services: ["Interior Fit Outs"],
    image: { src: `${P}/sultan-qaboos-mosque-01.jpg`, alt: "Entrance facade of Sultan Qaboos Mosque in Sohar", category: "project", source: "https://shanfarifurnishing.com/projects/sultan-qaboos-mosque-in-sohar/" },
    gallery: [
      { src: `${P}/sultan-qaboos-mosque-02.jpg`, alt: "Interior prayer hall carved detail" },
      { src: `${P}/sultan-qaboos-mosque-03.jpg`, alt: "Mosque courtyard joinery" },
      { src: `${P}/sultan-qaboos-mosque-04.jpg`, alt: "Mosque interior archway joinery" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/sultan-qaboos-mosque-in-sohar/",
  },
  {
    slug: "bousher-intercity-hotel-muscat",
    name: "Intercity Hotel Bousher",
    location: "Muscat, Oman",
    category: "Hospitality",
    completionYear: 2023,
    client: "Tanmia",
    designConsultant: "Surpassing Standards International — Surinaa Triveen",
    projectCost: "OMR 1.74 M",
    summary: "Complete interior fit-out bringing elegance and functionality together across the hotel.",
    description:
      "For Intercity Hotel Bousher, Shanfari Furnishing delivered a complete interior fit-out guided by versatility as its defining concept — bespoke joinery across guest rooms, lobbies, restaurants, conference spaces and pool deck furniture.",
    services: ["Interior Design", "Interior Fit Outs"],
    image: { src: `${P}/intercity-hotel-01.jpg`, alt: "Reception joinery and fit-out at Intercity Hotel Bousher", category: "project", source: "https://shanfarifurnishing.com/projects/bousher-intercity-hotel-muscat/" },
    gallery: [
      { src: `${P}/intercity-hotel-02.jpg`, alt: "Guest room interior fit-out" },
      { src: `${P}/intercity-hotel-03.jpg`, alt: "Hotel restaurant joinery" },
      { src: `${P}/intercity-hotel-04.jpg`, alt: "Hotel lobby seating area" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/bousher-intercity-hotel-muscat/",
  },
  {
    slug: "al-bustan-place-hotel-in-muscat",
    name: "Al Bustan Palace Hotel",
    location: "Muscat, Oman",
    category: "Hospitality",
    completionYear: 2018,
    client: "Royal Court of Affairs",
    designConsultant: "Surpassing Standards International — Surinaa Triveen",
    projectCost: "OMR 3,021,967",
    summary: "Joinery and furniture across a five-star hotel's rooms, suites and event halls.",
    description:
      "Al Bustan Palace Hotel, a five-star property in Muscat that has hosted heads of state since the 1980s, received joinery and furniture work by Shanfari Furnishing across its spacious rooms, multiple suites and event facilities.",
    services: ["Interior Design", "Interior Furniture"],
    image: { src: `${P}/al-bustan-palace-01.jpg`, alt: "Grand lobby seating at Al Bustan Palace Hotel", category: "project", source: "https://shanfarifurnishing.com/projects/al-bustan-place-hotel-in-muscat/" },
    gallery: [
      { src: `${P}/al-bustan-palace-02.jpg`, alt: "Hotel suite furniture detail" },
      { src: `${P}/al-bustan-palace-03.jpg`, alt: "Event hall joinery" },
      { src: `${P}/al-bustan-palace-04.jpg`, alt: "Hotel corridor furnishings" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/al-bustan-place-hotel-in-muscat/",
  },
  {
    slug: "taqah-private-palace-salalah",
    name: "Taqah Private Palace",
    location: "Salalah, Oman",
    category: "Residential",
    completionYear: 2023,
    client: "Private Client",
    designConsultant: "Khalil Nadex Al Fajer Consultants",
    projectCost: "OMR 1.76 M",
    summary: "Classic furnishings with exquisite hand-carved inlay work for a private palace in Salalah.",
    description:
      "The Taqah Private Palace in Salalah features classic furnishings by Shanfari Furnishing — hand-carved wooden elements and mother-of-pearl inlay across entry gates, corridors, a majilis and executive offices.",
    services: ["Interior Furniture", "Interior Design"],
    image: { src: `${P}/taqah-palace-01.jpg`, alt: "Exterior view of the Taqah Private Palace", category: "project", source: "https://shanfarifurnishing.com/projects/taqah-private-palace-salalah/" },
    gallery: [
      { src: `${P}/taqah-palace-02.jpg`, alt: "Hand-carved majilis furniture" },
      { src: `${P}/taqah-palace-03.jpg`, alt: "Palace corridor with carved doors" },
      { src: `${P}/taqah-palace-04.jpg`, alt: "Palace dining room furnishings" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/taqah-private-palace-salalah/",
  },
  {
    slug: "al-mouj-private-villa-muscat",
    name: "Al Mouj Private Villa",
    location: "Muscat, Oman",
    category: "Residential",
    client: "Private Client",
    designConsultant: "Veselina Filipova",
    projectCost: "OMR 200,000",
    summary: "Contemporary Islamic design across fitted cabinetry, furniture and finishes.",
    description:
      "At the Al Mouj Private Villa, Shanfari Furnishing applied Islamic design in a contemporary style — including fitted cabinets, furniture, door refurbishment and specialist painting throughout the residence.",
    services: ["Interior Design", "Interior Furniture", "Interior Fit Outs"],
    image: { src: `${P}/al-mouj-villa-01.jpg`, alt: "Carved geometric wardrobe joinery at the Al Mouj Private Villa", category: "project", source: "https://shanfarifurnishing.com/projects/al-mouj-private-villa-muscat/" },
    gallery: [
      { src: `${P}/al-mouj-villa-02.jpg`, alt: "Villa living room furniture" },
      { src: `${P}/al-mouj-villa-03.jpg`, alt: "Villa fitted cabinetry detail" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/al-mouj-private-villa-muscat/",
  },
  {
    slug: "bousher-private-villa-muscat",
    name: "Bousher Private Villa",
    location: "Muscat, Oman",
    category: "Residential",
    completionYear: 2012,
    client: "Private Client",
    designConsultant: "LAA Landscape Architecture Associates — Ghida Abiad",
    projectCost: "OMR 1.74 M",
    summary: "A nine-metre pergola and custom outdoor furniture overlooking mountains and palm oasis.",
    description:
      "This residential villa features a contemporary landscape design centred on a nine-metre pergola built with steel framework and Sapele wood, providing shade while preserving mountain views. Custom outdoor furniture complements the pergola's grid pattern; the villa owners participated in every stage of design and implementation.",
    services: ["Interior Furniture"],
    image: { src: `${P}/bousher-villa-01.jpg`, alt: "Nine-metre timber pergola with outdoor furniture at the Bousher Private Villa", category: "project", source: "https://shanfarifurnishing.com/projects/bousher-private-villa-muscat/" },
    gallery: [
      { src: `${P}/bousher-villa-02.jpg`, alt: "Pergola timber grid detail" },
      { src: `${P}/bousher-villa-03.jpg`, alt: "Outdoor furniture beneath the pergola" },
      { src: `${P}/bousher-villa-04.jpg`, alt: "Garden view from the pergola" },
    ],
    sourceUrl: "https://shanfarifurnishing.com/projects/bousher-private-villa-muscat/",
  },
];

export type ShanfariService = {
  number: string;
  title: string;
  description: string;
  image: ShanfariImage;
  relatedProjectSlug: string;
};

/** Verbatim-paraphrased from https://shanfarifurnishing.com/services/ —
 * exactly the four services the company publishes, nothing added. */
export const SHANFARI_SERVICES: ShanfariService[] = [
  {
    number: "01",
    title: "Interior Design",
    description:
      "A team of design experts producing custom interiors that reflect each client's personality and taste — developing narratives within historic buildings and private homes that combine aesthetic appeal with practical living value.",
    image: { src: "/images/shanfari/projects/intercity-hotel-01.jpg", alt: "Reception joinery and fit-out at Intercity Hotel Bousher", category: "project", source: "https://shanfarifurnishing.com/projects/bousher-intercity-hotel-muscat/" },
    relatedProjectSlug: "bousher-intercity-hotel-muscat",
  },
  {
    number: "02",
    title: "Interior Furniture",
    description:
      "Every piece made with meticulous attention to detail, using the finest materials and both traditional and innovative techniques — ornate patterns designed to transform rooms, from living areas to bedrooms.",
    image: { src: "/images/shanfari/projects/al-mouj-villa-01.jpg", alt: "Carved geometric wardrobe joinery at the Al Mouj Private Villa", category: "project", source: "https://shanfarifurnishing.com/projects/al-mouj-private-villa-muscat/" },
    relatedProjectSlug: "al-mouj-private-villa-muscat",
  },
  {
    number: "03",
    title: "Interior Fit Outs",
    description:
      "More than four decades of experience and continuous investment in production facilities make Shanfari a reliable interior contractor — managing projects from conception through on-site execution with in-house production and turnkey delivery.",
    image: { src: "/images/shanfari/projects/royal-opera-house-01.jpg", alt: "Auditorium seating, orchestra and organ enclosure at the Royal Opera House Muscat", category: "project", source: "https://shanfarifurnishing.com/projects/royal-opera-house-muscat/" },
    relatedProjectSlug: "royal-opera-house-muscat",
  },
  {
    number: "04",
    title: "Exhibition Set Works",
    description:
      "Exhibition design expertise applied to museum installations — working with cutting-edge materials and technologies alongside designers and curators on installations that prioritise both display and presentation.",
    image: { src: "/images/shanfari/projects/rohm-exhibition-02.jpg", alt: "Interactive circular exhibit table inside the ROHM Exhibition of Royal Arts", category: "project", source: "https://shanfarifurnishing.com/projects/rohm-exhibition-musical-arts-muscat/" },
    relatedProjectSlug: "rohm-exhibition-musical-arts-muscat",
  },
];
