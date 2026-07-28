import type { Metadata } from "next";
import { Courier_Prime, Instrument_Sans } from "next/font/google";
import { env, warnOnce } from "@/lib/env";
import "./globals.css";

/**
 * Two faces, two jobs.
 *  - Courier Prime is anything that is script, transcript, label or data. It is
 *    the typeface screenplays are actually set in, so monospace here means
 *    "this is the record", not "this is decorative".
 *  - Instrument Sans handles everything else — headlines included, set bold and
 *    tight. One voice for the site's own words keeps the Courier material
 *    unmistakably "the record".
 */
const script = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-script",
  display: "swap",
});

const ui = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  // Makes the generated share-card URLs absolute, which every social scraper
  // requires. Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(env.siteUrl),
  title: "It's Not a Lie — can you get an AI to defend its favourite wrong answer?",
  description:
    "Type in a fandom fact you know cold. We run it past an AI five times and you grade the answers. Independent research into how language models misremember fiction.",
  openGraph: {
    title: "It's Not a Lie",
    description:
      "Can you get an AI to defend its favourite wrong answer? Bring a fact you know cold.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  warnOnce();
  return (
    <html lang="en" className={`${script.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
