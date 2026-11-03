"use client";

import dynamic from "next/dynamic";

/**
 * AreaChartCard, loaded on demand. The chart library (recharts, ~100 kB) is
 * fetched after the rest of the page is interactive instead of being part of
 * the page's first download. A card-shaped skeleton holds the space so the
 * layout doesn't jump when the chart arrives.
 */
export const AreaChartCard = dynamic(
  () => import("@/components/dashboard/area-chart-card").then((m) => m.AreaChartCard),
  {
    ssr: false,
    loading: () => (
      <div className="surface-card flex flex-col gap-4 p-5" aria-hidden="true">
        <span className="skeleton block h-4 w-44 rounded" />
        <span className="skeleton block h-[280px] w-full rounded-lg" />
      </div>
    ),
  },
);
