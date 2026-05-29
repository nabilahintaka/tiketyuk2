/**
 * Tujuan: Next.js config — image domains, Turbopack root
 * Caller: Next.js build/dev
 * Dependensi: -
 * Main Functions: nextConfig export
 * Side Effects: -
 */
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.mizea.my.id',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      }
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
