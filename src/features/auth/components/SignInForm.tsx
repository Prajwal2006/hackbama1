"use client";

import { ArrowLeft, Mail, MessageSquareCode } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { requestCodeAction, verifyCodeAction, type CodeState } from "../actions";

export function SignInForm({ campus, domains, next }: { campus: string; domains: string[]; next: string }) {
  // One state machine: the submit button's `intent` picks the step.
  const [state, action, pending] = useActionState(async (prev: CodeState, fd: FormData): Promise<CodeState> => {
    const intent = fd.get("intent");
    if (intent === "reset") return { step: "email", email: prev.email };
    return intent === "verify" ? verifyCodeAction(prev, fd) : requestCodeAction(prev, fd);
  }, { step: "email" } as CodeState);
  const requesting = pending;
  const verifying = pending;

  if (state.step === "code") {
    return (
      <form action={action} className="flex flex-col gap-4" data-testid="code-form">
        <input type="hidden" name="campus" value={campus} />
        <input type="hidden" name="next" value={next} />
        <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4">
          <MessageSquareCode className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-sm text-ink-2">
            {state.delivery === "email" ? (
              <>We sent a 6-digit code to <strong className="text-ink">{state.email}</strong>. It expires in 10 minutes.</>
            ) : (
              <>
                Demo delivery: no email provider is configured, so here&apos;s the code for{" "}
                <strong className="text-ink">{state.email}</strong>. With an email provider it goes to the inbox instead.
              </>
            )}
          </p>
        </div>
        {state.screenCode ? (
          <p className="sticker mx-auto -rotate-2 bg-sticker px-5 py-2 font-mono text-3xl tracking-[0.3em] text-[#16120f]" data-testid="screen-code">
            {state.screenCode}
          </p>
        ) : null}
        <div>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            placeholder="••••••"
            className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
            aria-invalid={!!state.error}
          />
        </div>
        <FieldError>{state.error}</FieldError>
        <Button type="submit" name="intent" value="verify" size="lg" disabled={verifying} data-testid="verify-code">
          {verifying ? "Checking…" : "Verify & sign in"}
        </Button>
        <button type="submit" name="intent" value="reset" formNoValidate className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> Use a different email or resend
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="campus" value={campus} />
      <div>
        <Label htmlFor="email">Campus email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} placeholder={`you@${domains[0]}`} aria-invalid={!!state.error} />
        <p className="mt-1 text-xs text-ink-3">Accepted: {domains.map((d) => `@${d}`).join(", ")}</p>
      </div>
      <div>
        <Label htmlFor="name">Display name <span className="font-normal text-ink-3">(first name + last initial)</span></Label>
        <Input id="name" name="name" maxLength={40} placeholder="Jordan T." />
      </div>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" name="intent" value="request" size="lg" disabled={requesting} data-testid="send-code">
        <Mail /> {requesting ? "Sending…" : "Send me a code"}
      </Button>
    </form>
  );
}
