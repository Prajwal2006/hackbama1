import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/shell/Providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Dibs — See it. Want it. Call dibs.", template: "%s · Dibs" },
  description:
    "The campus-verified marketplace for move-out season. Buy, bid on, or claim free dorm gear from students at your school.",
  openGraph: {
    title: "Dibs — See it. Want it. Call dibs.",
    description: "Campus-verified move-out marketplace: fixed price, live auctions, and free stuff.",
    type: "website",
    siteName: "Dibs",
  },
  twitter: { card: "summary_large_image", title: "Dibs", description: "See it. Want it. Call dibs." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0b0a" },
    { media: "(prefers-color-scheme: light)", color: "#f3ede2" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} dark antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
