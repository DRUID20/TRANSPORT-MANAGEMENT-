import { Outfit, JetBrains_Mono } from "next/font/google";

/**
 * Fonts per DESIGN.md §3 + UNOC template.
 * - Display/headings: Outfit (500/600/700)
 * - Body/UI: Outfit (400/500/600/700) — single typeface across the system
 *   (matches the UNOC / Mofi reference). Inter is retired.
 * - Data/numbers: JetBrains Mono (tabular figures)
 */
export const fontDisplay = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const fontSans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
