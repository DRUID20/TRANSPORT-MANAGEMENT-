import { Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DriverScanPage() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Document scan</CardTitle>
          <CardDescription>Camera + AI extract</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/30">
              <Camera className="size-6" />
            </div>
            <div className="text-sm font-medium text-fg-primary">Coming next: Phase 2G</div>
            <p className="max-w-xs text-xs text-fg-tertiary">
              Snap a manifest, weighbridge slip, or POD. Claude extracts the
              fields; manager approves on the office app.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
