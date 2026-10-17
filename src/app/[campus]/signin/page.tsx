import { ArrowLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CampusTheme } from "@/components/shell/CampusTheme";
import { Wordmark } from "@/components/shell/Wordmark";
import { Button } from "@/components/ui/button";
import { signInAsDemoStudent } from "@/features/auth/actions";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { resolveCampus } from "@/lib/campus";
import { authMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ params, searchParams }: PageProps<"/[campus]/signin">) {
  const campus = resolveCampus((await params).campus);
  const rawNext = (await searchParams).next;
  const next = typeof rawNext === "string" && rawNext.startsWith(`/${campus.slug}`) ? rawNext : `/${campus.slug}`;
  const mock = authMode === "mock";

  return (
    <div data-campus={campus.slug} className="grain grid min-h-dvh place-items-center bg-bg px-safe py-10">
      <CampusTheme campus={campus} />
      <div className="w-full max-w-md">
        <Link href={`/${campus.slug}`} className="mb-8 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Back to {campus.shortName}
        </Link>
        <Wordmark className="text-5xl" campus={campus.shortName} />
        <h1 className="mt-6 font-display text-3xl font-extrabold">Students only. That&apos;s the point.</h1>
        <p className="mt-2 text-ink-2">
          Verify with your {campus.name} email to call dibs, bid, and sell. Everyone on Dibs {campus.shortName} is a verified student.
        </p>

        <div className="mt-8 flex flex-col gap-6 rounded-[1.75rem] border border-line bg-surface p-6">
          {mock ? (
            <>
              <form action={signInAsDemoStudent}>
                <input type="hidden" name="campus" value={campus.slug} />
                <input type="hidden" name="next" value={next} />
                <Button size="lg" className="w-full" data-testid="demo-signin">
                  <Sparkles /> Continue as demo student
                </Button>
                <p className="mt-2 text-center text-xs text-ink-3">Seeded account with bids, saves and a reservation already in progress.</p>
              </form>
              <div className="flex items-center gap-3 text-xs text-ink-3">
                <span className="h-px flex-1 bg-line" /> or try the email check <span className="h-px flex-1 bg-line" />
              </div>
            </>
          ) : null}
          <SignInForm campus={campus.slug} domains={campus.emailDomains} next={next} mock={mock} />
        </div>
      </div>
    </div>
  );
}
