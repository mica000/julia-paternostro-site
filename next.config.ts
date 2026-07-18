import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats first — big win for an image-heavy gallery.
    formats: ["image/avif", "image/webp"],
    // Widths next/image will pre-generate. Tune to your real tile sizes.
    deviceSizes: [640, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
