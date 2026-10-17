import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grain grid min-h-dvh place-items-center bg-bg px-safe text-center">
      <div>
        <span className="stamp text-6xl">gone</span>
        <h1 className="mt-8 font-display text-4xl font-extrabold">Someone already called dibs on this page.</h1>
        <p className="mt-3 text-ink-2">Or it never existed. Either way, there&apos;s nothing here.</p>
        <Link href="/" className={buttonVariants({ className: "mt-8" })}>
          Back to Dibs
        </Link>
      </div>
    </main>
  );
}
