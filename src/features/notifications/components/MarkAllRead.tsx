"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllReadAction } from "../actions";

export function MarkAllRead({ campus }: { campus: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllReadAction(campus);
          router.refresh();
        })
      }
    >
      <CheckCheck /> Mark all read
    </Button>
  );
}
