import type { CampusConfig, CampusTheme as Tokens } from "@/config/campuses";

const vars = (t: Tokens) =>
  `--accent:${t.accent};--accent-ink:${t.accentInk};--accent-2:${t.accent2};--glow:${t.glow};`;

/**
 * Injects a campus's color tokens for both themes. Applied to <html> whenever a
 * `[data-campus]` element is on the page, so portaled dialogs/toasts match too.
 */
export function CampusTheme({ campus }: { campus: CampusConfig }) {
  const has = `:has([data-campus="${campus.slug}"])`;
  const css = `html${has}{${vars(campus.theme.light)}} html.dark${has}{${vars(campus.theme.dark)}}`;
  return <style precedence="default" href={`campus-theme-${campus.slug}`}>{css}</style>;
}
