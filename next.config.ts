import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // All product/service/customer/unit photos are served by Cloudinary via the
    // backend upload flow; we allow that CDN plus a couple of profile-photo
    // sources the app previously accepted (see the legacy isValidProfilePhotoUrl
    // allowlist in index.html.bak).
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
    ],
  },
  eslint: {
    // Keep builds unblocked during the incremental migration; the linter still
    // runs in `next lint` and CI when it's enabled.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
