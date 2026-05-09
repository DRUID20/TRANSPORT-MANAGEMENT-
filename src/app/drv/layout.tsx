import { TooltipProvider } from "@/components/ui/tooltip";
import { DriverBottomNav } from "@/components/driver/bottom-nav";
import { DriverHeader } from "@/components/driver/header";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-bg-base text-fg-primary">
        <DriverHeader />
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="mx-auto w-full max-w-md p-4">{children}</div>
        </main>
        <DriverBottomNav />
      </div>
    </TooltipProvider>
  );
}
