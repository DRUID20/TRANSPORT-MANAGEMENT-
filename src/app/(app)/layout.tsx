import { AppShell } from "@/components/layout/app-shell";

/**
 * Force per-request rendering for every page in the app shell.
 *
 * Without this, Next statically prerenders ~35 list pages at build time,
 * baking the seed data into HTML. On Vercel that means creates appear to
 * vanish (the static page never reflects the in-memory store, and
 * revalidation regenerates on a different lambda). Dashboard-style apps
 * should render fresh — and this also matches how the pages will behave
 * once the Supabase database replaces the in-memory store.
 */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
