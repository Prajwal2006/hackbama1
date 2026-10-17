"use client";

import { Command } from "cmdk";
import { ArrowRight, Moon, Search, Sun } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { featureHref, featuresFor } from "@/config/features";
import { CATEGORIES, CATEGORY_LABEL } from "@/data/types";
import { FEATURE_ICONS } from "./icons";
import type { ShellCampus } from "./types";

const PaletteCtx = createContext<{ open: () => void }>({ open: () => {} });
export const usePalette = () => useContext(PaletteCtx);

const item =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[0.95rem] text-ink-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink";
const group = "px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase";

/** Cmd/Ctrl+K palette. Navigation entries come from the feature registry. */
export function CommandPaletteProvider({
  campus,
  campuses,
  children,
}: {
  campus: string;
  campuses: ShellCampus[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <PaletteCtx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" />
          <D.Content
            className="fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-[60] w-[min(94vw,36rem)] -translate-x-1/2 overflow-hidden rounded-[1.5rem] border border-line-strong bg-surface shadow-2xl outline-none sm:top-[14vh]"
            aria-describedby={undefined}
          >
            <D.Title className="sr-only">Command palette</D.Title>
            <Command label="Command palette" loop>
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="size-5 text-ink-3" />
                <Command.Input
                  value={q}
                  onValueChange={setQ}
                  placeholder="Search listings or jump to…"
                  className="h-14 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
                />
                <kbd className="hidden rounded-md border border-line-strong px-1.5 py-0.5 font-mono text-xs text-ink-3 sm:block">esc</kbd>
              </div>
              <Command.List className="max-h-[min(60dvh,26rem)] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-ink-3">Nothing matches.</Command.Empty>
                {q.trim() ? (
                  <Command.Group heading="Search" className={group}>
                    <Command.Item
                      value={`search ${q}`}
                      onSelect={() => go(`/${campus}/browse?q=${encodeURIComponent(q.trim())}`)}
                      className={item}
                    >
                      <Search className="size-4" /> Search listings for “{q.trim()}”
                      <ArrowRight className="ml-auto size-4" />
                    </Command.Item>
                  </Command.Group>
                ) : null}
                <Command.Group heading="Go to" className={group}>
                  {featuresFor(campus)
                    .filter((f) => f.nav.palette)
                    .map((f) => {
                      const Icon = FEATURE_ICONS[f.icon];
                      return (
                        <Command.Item
                          key={f.id}
                          value={`${f.title} ${f.blurb} ${(f.keywords ?? []).join(" ")}`}
                          onSelect={() => go(featureHref(campus, f))}
                          className={item}
                        >
                          <Icon className="size-4" />
                          <span className="text-ink">{f.title}</span>
                          <span className="hidden truncate text-sm text-ink-3 sm:inline">{f.blurb}</span>
                          {f.status === "planned" ? (
                            <span className="ml-auto font-mono text-[0.65rem] text-ink-3 uppercase">soon</span>
                          ) : null}
                        </Command.Item>
                      );
                    })}
                </Command.Group>
                <Command.Group heading="Categories" className={group}>
                  {CATEGORIES.map((c) => (
                    <Command.Item key={c} value={`category ${CATEGORY_LABEL[c]}`} onSelect={() => go(`/${campus}/browse?category=${c}`)} className={item}>
                      {CATEGORY_LABEL[c]}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="Campus & settings" className={group}>
                  {campuses.map((c) => (
                    <Command.Item key={c.slug} value={`switch campus ${c.name} ${c.shortName}`} onSelect={() => go(`/${c.slug}`)} className={item}>
                      Switch to {c.name}
                      {c.slug === campus ? <span className="ml-auto text-xs text-ink-3">current</span> : null}
                    </Command.Item>
                  ))}
                  <Command.Item
                    value="toggle theme dark light"
                    onSelect={() => {
                      setTheme(resolvedTheme === "dark" ? "light" : "dark");
                      setOpen(false);
                    }}
                    className={item}
                  >
                    {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </D.Content>
        </D.Portal>
      </D.Root>
    </PaletteCtx.Provider>
  );
}

export function PaletteTrigger({ className }: { className?: string }) {
  const { open } = usePalette();
  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  return (
    <button
      type="button"
      onClick={open}
      className={className}
      aria-label="Search and commands"
      aria-keyshortcuts="Meta+K Control+K"
    >
      <Search className="size-[1.1rem] shrink-0" />
      <span className="hidden flex-1 text-left lg:inline">Search fridges, futons, free stuff…</span>
      <kbd className="hidden rounded-md border border-line-strong px-1.5 font-mono text-[0.7rem] lg:inline">{mac ? "⌘" : "Ctrl"} K</kbd>
    </button>
  );
}
