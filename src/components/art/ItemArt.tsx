import type { Category } from "@/data/types";
import { cn } from "@/lib/utils";

/**
 * Locally generated, flat-ink illustrations for listing categories.
 * Deterministic per listing via `seed` (hue). No external images.
 */

const O = "#16120f"; // outline ink

function Fridge({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <rect x="62" y="40" width="76" height="118" rx="12" fill={c.main} />
      <line x1="62" y1="82" x2="138" y2="82" />
      <rect x="124" y="52" width="6" height="20" rx="3" fill={c.light} />
      <rect x="124" y="92" width="6" height="28" rx="3" fill={c.light} />
      <rect x="70" y="158" width="10" height="8" fill={O} />
      <rect x="120" y="158" width="10" height="8" fill={O} />
      <circle cx="84" cy="62" r="7" fill={c.accent} />
      <path d="M78 104h22" stroke={c.light} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}
function Microwave({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <rect x="36" y="64" width="128" height="80" rx="10" fill={c.main} />
      <rect x="48" y="76" width="78" height="56" rx="6" fill={c.dark} />
      <path d="M58 118c10-12 30-12 40 0" stroke={c.accent} fill="none" />
      <rect x="136" y="78" width="18" height="10" rx="3" fill={c.light} />
      <circle cx="145" cy="104" r="5" fill={c.light} />
      <circle cx="145" cy="122" r="5" fill={c.light} />
      <rect x="46" y="144" width="12" height="7" fill={O} />
      <rect x="142" y="144" width="12" height="7" fill={O} />
    </g>
  );
}
function Lamp({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M100 66v86" />
      <path d="M66 70l14-36h40l14 36z" fill={c.main} />
      <ellipse cx="100" cy="158" rx="30" ry="8" fill={c.dark} />
      <path d="M86 84l-10 22M114 84l10 22" stroke={c.accent} strokeWidth="3" opacity="0.8" />
      <circle cx="100" cy="76" r="6" fill={c.accent} stroke="none" />
    </g>
  );
}
function Chair({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <rect x="68" y="36" width="64" height="62" rx="16" fill={c.main} />
      <rect x="60" y="100" width="80" height="20" rx="8" fill={c.light} />
      <path d="M100 120v24M78 158l22-14 22 14" />
      <circle cx="78" cy="160" r="4" fill={O} />
      <circle cx="122" cy="160" r="4" fill={O} />
      <path d="M80 56h40M80 72h40" stroke={c.dark} strokeWidth="3" />
    </g>
  );
}
function Furniture({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <rect x="32" y="78" width="136" height="50" rx="14" fill={c.main} />
      <rect x="44" y="62" width="112" height="34" rx="12" fill={c.light} />
      <rect x="26" y="88" width="22" height="44" rx="10" fill={c.dark} />
      <rect x="152" y="88" width="22" height="44" rx="10" fill={c.dark} />
      <line x1="100" y1="96" x2="100" y2="126" />
      <rect x="40" y="132" width="8" height="16" fill={O} />
      <rect x="152" y="132" width="8" height="16" fill={O} />
      <circle cx="72" cy="80" r="6" fill={c.accent} />
    </g>
  );
}
function Rug({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <path d="M30 120l70-44 70 44-70 44z" fill={c.main} />
      <path d="M58 120l42-26 42 26-42 26z" fill={c.light} />
      <path d="M82 120l18-11 18 11-18 11z" fill={c.accent} />
      <path d="M30 120l-8 4M170 120l8 4M100 164l0 8" />
    </g>
  );
}
function Tv({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <rect x="28" y="48" width="144" height="88" rx="8" fill={c.dark} />
      <rect x="36" y="56" width="128" height="72" rx="4" fill={c.main} />
      <path d="M36 110c30-26 60 10 128-30v48H36z" fill={c.light} stroke="none" />
      <circle cx="134" cy="76" r="9" fill={c.accent} stroke="none" />
      <path d="M78 136l-12 20M122 136l12 20M58 156h84" />
    </g>
  );
}
function Electronics({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M46 92c0-18 14-28 30-28h48c16 0 30 10 30 28l8 44c2 14-14 20-22 8l-12-16H72l-12 16c-8 12-24 6-22-8z" fill={c.main} />
      <circle cx="78" cy="96" r="10" fill={c.dark} />
      <circle cx="122" cy="96" r="10" fill={c.dark} />
      <circle cx="140" cy="80" r="4" fill={c.accent} stroke="none" />
      <circle cx="150" cy="92" r="4" fill={c.light} stroke="none" />
      <path d="M58 82h12M64 76v12" stroke={c.light} />
    </g>
  );
}
function Bedding({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <rect x="30" y="94" width="140" height="54" rx="12" fill={c.main} />
      <rect x="40" y="74" width="56" height="30" rx="14" fill={c.light} />
      <rect x="104" y="74" width="56" height="30" rx="14" fill={c.light} />
      <path d="M30 118h140" stroke={c.dark} />
      <path d="M48 132h22M84 132h22M120 132h22" stroke={c.accent} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}
function Textbook({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <rect x="46" y="118" width="112" height="22" rx="4" fill={c.dark} />
      <rect x="54" y="96" width="100" height="22" rx="4" fill={c.light} />
      <rect x="40" y="56" width="92" height="40" rx="4" fill={c.main} transform="rotate(-6 86 76)" />
      <path d="M60 70h44" stroke={c.light} strokeWidth="5" strokeLinecap="round" transform="rotate(-6 86 76)" />
      <path d="M150 118v22" stroke={c.accent} strokeWidth="6" />
    </g>
  );
}
function Plant({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M100 116c-4-24-26-34-44-30 2 22 20 32 44 30z" fill={c.light} />
      <path d="M100 116c4-30 26-48 48-44-2 26-22 44-48 44z" fill={c.main} />
      <path d="M100 116c-2-26 4-48 14-62 8 22 2 46-14 62z" fill={c.accent} />
      <path d="M72 116h56l-8 44H80z" fill={c.dark} />
    </g>
  );
}
function Bike({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" fill="none">
      <circle cx="58" cy="128" r="28" fill={c.light} />
      <circle cx="142" cy="128" r="28" fill={c.light} />
      <path d="M58 128l30-42h42l12 42M88 86l22 42h32M84 76h18M126 70l4 16" stroke={c.dark} strokeWidth="6" />
      <circle cx="110" cy="128" r="5" fill={O} />
      <circle cx="58" cy="128" r="6" fill={c.accent} />
      <circle cx="142" cy="128" r="6" fill={c.accent} />
    </g>
  );
}
function Kitchen({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M48 96h88v14c0 22-16 36-44 36s-44-14-44-36z" fill={c.main} />
      <path d="M136 104h28" strokeWidth="8" />
      <path d="M64 84c0-10 8-10 8-20M88 84c0-10 8-10 8-20M112 84c0-10 8-10 8-20" stroke={c.accent} strokeWidth="3" />
      <ellipse cx="92" cy="98" rx="40" ry="6" fill={c.dark} />
    </g>
  );
}
function Other({ c }: { c: Palette }) {
  return (
    <g stroke={O} strokeWidth="4" strokeLinejoin="round">
      <path d="M44 84l56-24 56 24v60l-56 22-56-22z" fill={c.main} />
      <path d="M44 84l56 22 56-22M100 106v60" />
      <path d="M72 72l56 22v20" stroke={c.dark} strokeWidth="8" />
      <rect x="112" y="122" width="26" height="14" rx="2" fill={c.light} transform="rotate(-20 125 129)" />
    </g>
  );
}

const ART: Record<Category, (p: { c: Palette }) => React.ReactElement> = {
  fridge: Fridge, microwave: Microwave, lamp: Lamp, chair: Chair, furniture: Furniture, rug: Rug, tv: Tv,
  electronics: Electronics, bedding: Bedding, textbook: Textbook, plant: Plant, bike: Bike, kitchen: Kitchen, other: Other,
};

type Palette = { bg: string; main: string; light: string; dark: string; accent: string };

function palette(seed: number): Palette {
  const h = seed % 360;
  return {
    bg: `hsl(${h} 38% 86%)`,
    main: `hsl(${(h + 180) % 360} 62% 58%)`,
    light: `hsl(${(h + 30) % 360} 70% 92%)`,
    dark: `hsl(${(h + 200) % 360} 30% 28%)`,
    accent: `hsl(${(h + 320) % 360} 88% 60%)`,
  };
}

export function ItemArt({
  category,
  seed,
  className,
  title,
}: {
  category: Category;
  seed: number;
  className?: string;
  title?: string;
}) {
  const c = palette(seed);
  const Art = ART[category] ?? Other;
  const rid = `g${seed}${category}`;
  return (
    <svg viewBox="0 0 200 200" className={cn("block h-full w-full", className)} role="img" aria-label={title ?? category}>
      <defs>
        <pattern id={rid} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2" cy="2" r="1.4" fill={O} opacity="0.09" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill={c.bg} />
      <rect width="200" height="200" fill={`url(#${rid})`} />
      <circle cx="160" cy="40" r="46" fill={c.light} opacity="0.7" />
      <ellipse cx="100" cy="170" rx="70" ry="10" fill={O} opacity="0.12" />
      <Art c={c} />
    </svg>
  );
}
