import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    // Tree-shake big barrel-export libs so a page that uses 3 icons doesn't
    // pull the whole set into its bundle — faster cold starts + smaller JS.
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    // Client router cache: re-opening a page you visited in the last 30s
    // (back button, switching between two lists) is instant instead of a
    // fresh server round-trip. Any save (server action → revalidatePath)
    // still clears the cache immediately, so edits always show up.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
