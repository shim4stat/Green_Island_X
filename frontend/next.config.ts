import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "*.ipfs.dweb.link",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**",
      },
      // 任意の外部画像を許可（開発時のみ推奨）
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
