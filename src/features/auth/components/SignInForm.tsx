"use client";

import { Mail } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { signInWithCampusEmail, type SignInState } from "../actions";

export function SignInForm({ campus, domains, next, mock }: { campus: string; domains: string[]; next: string; mock: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInWithCampusEmail, undefined);
  if (state?.sent) {
    return (
      <div className="rounded-2xl border border-line-strong p-5 text-center">
        <Mail className="mx-auto size-8 text-accent" />
        <p className="mt-3 font-display text-xl font-extrabold">Check your campus inbox</p>
        <p className="mt-1 text-sm text-ink-2">We sent a sign-in link. Clicking it is what verifies you.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="campus" value={campus} />
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">Campus email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder={`you@${domains[0]}`} aria-invalid={!!state?.error} />
        <p className="mt-1 text-xs text-ink-3">Accepted: {domains.map((d) => `@${d}`).join(", ")}</p>
      </div>
      {mock ? (
        <div>
          <Label htmlFor="name">Display name</Label>
          <Input id="name" name="name" placeholder="First name + last initial" maxLength={40} />
        </div>
      ) : null}
      <FieldError>{state?.error}</FieldError>
      <Button type="submit" variant="outline" size="lg" disabled={pending}>
        {pending ? "Checking…" : mock ? "Verify (simulated)" : "Email me a sign-in link"}
      </Button>
      {mock ? (
        <p className="text-xs text-ink-3">
          Demo mode: the domain is checked on the server, but no email is sent — so this does <strong>not</strong> prove you own the inbox.
        </p>
      ) : null}
    </form>
  );
}
