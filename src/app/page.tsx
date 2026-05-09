import { redirect } from "next/navigation";

export default function RootPage() {
  // Phase 0: no auth wired yet — land on the dashboard.
  // Once Supabase Auth is connected, this will check session and redirect to /login if absent.
  redirect("/dashboard");
}
