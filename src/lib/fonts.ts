import { Outfit, Inter, JetBrains_Mono } from "next/font/google";

/**
 * Fonts per DESIGN.md §3.
 * - Display/headings: Outfit (500/600/700 — 700 logo only)
 * - Body/UI: Inter
 * - Data/numbers: JetBrains Mono (tabular figures)
 */
export const fontDisplay = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
