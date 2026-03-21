import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 't.me',
        pathname: '/i/userpic/**',
      },
    ],
  },
};

export default nextConfig;
