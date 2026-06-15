import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    // Tree-shake big barrel-export libs so a page that uses 3 icons doesn't
    // pull the whole set into its bundle — faster cold starts + smaller JS.
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
