import { Outfit, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

/**
 * Fonts.
 * - UI chrome (sidebar, topbar, buttons, inputs, badges): Outfit.
 * - Page content (tables, headings, body text, KPI figures): Source Serif 4 —
 *   a book-style serif in the spirit of Claude's reply font, with tabular
 *   lining figures so numbers line up in columns. Applied via `.content-serif`
 *   (see globals.css) on <main> and on modal / slide-over panels.
 * - JetBrains Mono survives only inside the sidebar (badge counts, initials,
 *   logo) so the menu looks exactly as before.
 *
 * Variables are exposed under their own names; globals.css maps the semantic
 * `--font-sans` / `--font-mono` / `--font-display` onto them per scope.
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
  variable: "--font-outfit",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontSerif = Source_Serif_4({
  subsets: ["latin"],
  // Variable font: every weight 200–900 plus optical sizing, one file.
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
