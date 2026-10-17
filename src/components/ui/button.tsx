import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn-style button, restyled for Dibs: chunky, tactile, press-down feedback. */
export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,background-color,color,box-shadow,opacity] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_10px_24px_-12px_var(--accent)] hover:brightness-110",
        ink: "bg-ink text-bg hover:opacity-90",
        outline: "border border-line-strong bg-transparent text-ink hover:bg-surface-2",
        ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
        soft: "bg-surface-2 text-ink hover:bg-line-strong/40",
        danger: "bg-danger/12 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "h-9 rounded-full px-3.5 text-sm",
        md: "h-11 rounded-full px-5 text-[0.95rem]",
        lg: "h-14 rounded-full px-7 text-lg",
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
