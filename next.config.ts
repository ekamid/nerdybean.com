import path from "node:path";
import type { NextConfig } from "next";

// The public site URL, fixed at build time: Netlify's `URL` is only guaranteed during the build,
// and server code needs it at runtime too (canonical links, the admin's GitHub callback).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(siteUrl && { env: { NEXT_PUBLIC_SITE_URL: siteUrl } }),
  poweredByHeader: false,
  turbopack: { root: path.resolve(import.meta.dirname) },
  // Admin saves send uploaded images through a server action. Netlify Functions accept up to 6 MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // MDX content is read from disk at build time; make sure it ships with the server output.
  outputFileTracingIncludes: {
    "/**": ["./src/content/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
