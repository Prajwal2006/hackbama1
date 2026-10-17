import { ArrowRight, GitBranch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURE_ICONS } from "@/components/shell/icons";
import { buttonVariants } from "@/components/ui/button";
import { getFeatureByModuleSlug } from "@/config/features";
import { MODULE_PITCH } from "@/features/modules/pitch";
import { resolveCampus } from "@/lib/campus";

export async function generateMetadata({ params }: PageProps<"/[campus]/x/[module]">): Promise<Metadata> {
  const f = getFeatureByModuleSlug((await params).module);
  return { title: f?.title ?? "Not found" };
}

/**
 * Generic page for registry modules that haven't shipped. A feature branch
 * replaces it by adding `src/app/[campus]/(app)/x/<slug>/page.tsx`.
 */
export default async function ModulePage({ params }: PageProps<"/[campus]/x/[module]">) {
  const { campus: slug, module } = await params;
  const campus = resolveCampus(slug);
  const f = getFeatureByModuleSlug(module);
  if (!f) notFound();
  const Icon = FEATURE_ICONS[f.icon];
  const pitch = MODULE_PITCH[f.id];

  return (
    <div className="mx-auto max-w-4xl">
      <section className="grain relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-6 md:p-10">
        <div className="absolute -top-20 -right-20 size-72 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }} aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink">
            <Icon className="size-7" />
          </span>
          <span className="stamp text-xl">soon</span>
        </div>
        <h1 className="relative mt-6 font-display text-fluid-xl font-extrabold">{f.title}</h1>
        <p className="relative mt-3 max-w-xl text-lg text-ink-2">{f.blurb}</p>
        {pitch ? (
          <ul className="relative mt-8 grid gap-3 sm:grid-cols-3">
            {pitch.map((p, i) => (
              <li key={p} className="rounded-2xl border border-line bg-bg/40 p-4 text-sm text-ink-2">
                <span className="font-mono text-accent">0{i + 1}</span>
                <p className="mt-2">{p}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link href={`/${campus.slug}/browse`} className={buttonVariants()}>
            Browse the marketplace <ArrowRight />
          </Link>
          <Link href={`/${campus.slug}/x/swipe`} className={buttonVariants({ variant: "outline" })}>
            Try Swipe (beta)
          </Link>
        </div>
      </section>
      <p className="mt-6 flex items-center gap-2 font-mono text-xs text-ink-3">
        <GitBranch className="size-3.5" /> owner: {f.owner} · src/features/{f.id}/ · feature/{f.id}
      </p>
    </div>
  );
}
