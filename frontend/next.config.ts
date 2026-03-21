import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 't.me',
        pathname: '/i/userpic/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
  webpack(config) {
    // Prevent webpack from watching node_modules — avoids inotify watch exhaustion
    // when large packages like @dynamic-labs/sdk-react-core ship their source tree.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules/,
    };
    return config;
  },
};

export default nextConfig;
