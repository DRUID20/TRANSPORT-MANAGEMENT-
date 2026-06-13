import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { SidebarUserInfo } from "@/components/layout/sidebar-user";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentEmployee, getCurrentUser } from "@/server/auth/current-user";

function computeInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NV";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const sessionUser = await getCurrentUser();
  const fallback = getCurrentEmployee();
  const fullName = sessionUser?.fullName ?? fallback?.fullName ?? "Nile Valley";
  const user: SidebarUserInfo = {
    fullName,
    email: sessionUser?.email ?? fallback?.email ?? "—",
    roleKey: sessionUser?.roleKey ?? "viewer",
    initials: computeInitials(fullName),
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen w-full overflow-hidden bg-bg-base">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
