import type { NextConfig } from "next";

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
};

export default nextConfig;
