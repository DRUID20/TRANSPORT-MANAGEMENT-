import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";

/**
 * Project fonts.
 *
 * - Display (Sora): geometric, premium, distinctive — headings, hero
 *   numbers, section titles.
 * - Body/UI (Plus Jakarta Sans): warm high-end grotesque — everything else.
 * - Mono (Geist Mono): tabular figures for data/tables.
 *
 * Loaded via next/font so they self-host with zero layout shift.
 */
export const fontDisplay = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = GeistMono;
