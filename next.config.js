const { PHASE_PRODUCTION_BUILD } = require("next/constants");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: [
    "https://9000-firebase-studio-1767299015901.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev",
  ],
};

module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    process.env.NEXT_PUBLIC_PREVIEW_MODE = "false";
  }

  return nextConfig;
};
