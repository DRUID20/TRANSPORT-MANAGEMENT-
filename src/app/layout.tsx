import type { Metadata, Viewport } from "next";
import { fontMono, fontSans } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TX System — Nile Valley Logistics",
    template: "%s · TX System",
  },
  description: "Transport Management for Nile Valley Logistics — fleet, trips, finance, performance.",
  manifest: "/manifest.webmanifest",
  applicationName: "TX System",
  appleWebApp: {
    capable: true,
    title: "TX System",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          fontSans.variable,
          fontMono.variable,
          "min-h-screen bg-bg-base font-sans text-[15px] text-fg-primary antialiased",
        )}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
