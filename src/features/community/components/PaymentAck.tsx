"use client";

import { Check, HandCoins } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS } from "@/data/community-types";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Two-sided payment acknowledgement. Dibs never moves money — the payer says
 * "I sent it" (and how), the payee says "I got it".
 */
export function PaymentAck({
  role,
  amountCents,
  method,
  sentAt,
  receivedAt,
  pending,
  onSent,
  onReceived,
  payeeName,
  payerName,
}: {
  role: "payer" | "payee" | "viewer";
  amountCents: number;
  method: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  pending: boolean;
  onSent: (method: string) => void;
  onReceived: () => void;
  payeeName: string;
  payerName: string;
}) {
  const [pick, setPick] = useState<string>(method ?? "Venmo");
  const amount = formatCents(amountCents);

  return (
    <div className="rounded-2xl border border-line bg-bg/40 p-3" data-tour="payment">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <HandCoins className="size-4 text-accent" />
        <span className="font-semibold">{amount}</span>
        <span className="text-ink-3">paid outside Dibs{method ? ` · ${method}` : ""}</span>
      </div>
      <ol className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <li className={cn("flex items-center gap-1.5 rounded-xl px-2.5 py-2", sentAt ? "bg-success/12 text-success" : "bg-surface-2 text-ink-3")}>
          {sentAt ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-full border border-current" />} {payerName} sent
        </li>
        <li className={cn("flex items-center gap-1.5 rounded-xl px-2.5 py-2", receivedAt ? "bg-success/12 text-success" : "bg-surface-2 text-ink-3")}>
          {receivedAt ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-full border border-current" />} {payeeName} received
        </li>
      </ol>
      {role === "payer" && !sentAt ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="How you paid">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={pick === m}
                onClick={() => setPick(m)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold",
                  pick === m ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-ink-2",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <Button size="sm" className="mt-2 w-full" disabled={pending} onClick={() => onSent(pick)} data-testid="ack-sent">
            I sent {amount} via {pick}
          </Button>
        </div>
      ) : null}
      {role === "payee" && !receivedAt ? (
        <Button size="sm" variant={sentAt ? "primary" : "outline"} className="mt-3 w-full" disabled={pending} onClick={onReceived} data-testid="ack-received">
          {sentAt ? `Yes, I got ${amount}` : `I got ${amount} (e.g. cash at pickup)`}
        </Button>
      ) : null}
    </div>
  );
}
