/**
 * Campus (tenant) registry — the single source of truth for every tenant.
 *
 * Adding a campus = add one entry to `CAMPUSES` (+ optional seed data in
 * `src/data/seed`). Routing, theming, email-domain checks, pickup spots and
 * cross-campus policy all read from here.
 */

export type CampusTheme = {
  /** Primary electric accent. Used for CTAs, active states, stamps. */
  accent: string;
  /** Text color that sits on top of `accent`. */
  accentInk: string;
  /** A softer second accent for tags and highlights. */
  accent2: string;
  /** Subtle tint mixed into surfaces. */
  glow: string;
};

export type PickupSpot = {
  id: string;
  name: string;
  kind: "hall" | "apartments" | "landmark" | "lot";
};

export type CampusConfig = {
  slug: string;
  name: string;
  shortName: string;
  /** Mascot-free nickname used in copy. Never use trademarked logos. */
  tagline: string;
  /** Lowercased email domains that may verify into this campus. Subdomains must be listed. */
  emailDomains: string[];
  timezone: string;
  /** ISO dates (campus local). Drive the move-out / move-in countdown. */
  moveOutDate: string;
  moveInDate: string;
  theme: { dark: CampusTheme; light: CampusTheme };
  pickupSpots: PickupSpot[];
  /** Fictional campuses are flagged so the UI can say so. */
  fictional: boolean;
  crossCampus: {
    /** Campuses whose verified students may *see* this campus's listings. */
    discoverableBy: string[];
    /** Campuses whose verified students may *claim / bid* on this campus's listings. */
    transactableBy: string[];
  };
  /** Default reservation hold for dibs, in hours. */
  dibsHoldHours: number;
};

export const CAMPUSES = [
  {
    slug: "ua",
    name: "The University of Alabama",
    shortName: "UA",
    tagline: "Tuscaloosa's move-out, claimed.",
    emailDomains: ["ua.edu", "crimson.ua.edu"],
    timezone: "America/Chicago",
    moveOutDate: "2026-12-12",
    moveInDate: "2027-01-12",
    theme: {
      dark: { accent: "#e0243c", accentInk: "#fff6f0", accent2: "#f5c76b", glow: "#3a0d14" },
      light: { accent: "#a50f26", accentInk: "#fff6f0", accent2: "#b9771c", glow: "#f6dcdc" },
    },
    pickupSpots: [
      { id: "ridgecrest", name: "Ridgecrest South", kind: "hall" },
      { id: "presidential", name: "Presidential Village", kind: "hall" },
      { id: "tutwiler", name: "Tutwiler Hall", kind: "hall" },
      { id: "paty", name: "Paty Hall", kind: "hall" },
      { id: "lakeside", name: "Lakeside Residential", kind: "hall" },
      { id: "quad", name: "The Quad (by the library)", kind: "landmark" },
      { id: "ferg", name: "Ferguson Student Center", kind: "landmark" },
      { id: "bryce-lot", name: "Bryce Lawn lot", kind: "lot" },
    ],
    fictional: false,
    crossCampus: { discoverableBy: ["demo"], transactableBy: [] },
    dibsHoldHours: 24,
  },
  {
    slug: "demo",
    name: "Riverbend State University",
    shortName: "Riverbend",
    tagline: "A fictional campus proving Dibs isn't hardcoded.",
    emailDomains: ["riverbend.edu", "students.riverbend.edu"],
    timezone: "America/New_York",
    moveOutDate: "2026-12-18",
    moveInDate: "2027-01-19",
    theme: {
      dark: { accent: "#c8f442", accentInk: "#12140a", accent2: "#5fd4ff", glow: "#1d2a0c" },
      light: { accent: "#4d7a00", accentInk: "#f7ffe6", accent2: "#0b7fa8", glow: "#e7f4cc" },
    },
    pickupSpots: [
      { id: "north-tower", name: "North Tower", kind: "hall" },
      { id: "willow", name: "Willow Commons", kind: "apartments" },
      { id: "boathouse", name: "The Boathouse", kind: "landmark" },
      { id: "union", name: "Student Union steps", kind: "landmark" },
      { id: "lot-c", name: "Lot C", kind: "lot" },
    ],
    fictional: true,
    crossCampus: { discoverableBy: ["ua"], transactableBy: [] },
    dibsHoldHours: 24,
  },
] as const satisfies readonly CampusConfig[];

export type CampusSlug = (typeof CAMPUSES)[number]["slug"];

const BY_SLUG = new Map<string, CampusConfig>(CAMPUSES.map((c) => [c.slug, c]));

export function getCampus(slug: string): CampusConfig | undefined {
  return BY_SLUG.get(slug.toLowerCase());
}

export function isCampusSlug(slug: string): slug is CampusSlug {
  return BY_SLUG.has(slug.toLowerCase());
}

export function listCampuses(): CampusConfig[] {
  return [...CAMPUSES];
}

/** Returns the email's domain if it is allowed for `campus`, else null. */
export function matchEmailDomain(campus: CampusConfig, email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return campus.emailDomains.includes(domain) ? domain : null;
}

/** Finds the campus an email belongs to (exact domain match only). */
export function campusForEmail(email: string): CampusConfig | undefined {
  return CAMPUSES.find((c) => matchEmailDomain(c, email) !== null);
}

export function pickupSpotName(campus: CampusConfig, id: string | null | undefined) {
  if (!id) return null;
  return campus.pickupSpots.find((s) => s.id === id)?.name ?? null;
}
