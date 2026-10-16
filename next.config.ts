import type { NextConfig } from "next";

const s3Hostname = (() => {
  try {
    const endpoint = process.env.S3_ENDPOINT ?? "";
    return endpoint ? new URL(endpoint).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: s3Hostname
      ? [{ protocol: "https", hostname: s3Hostname }]
      : [],
  },
};

export default nextConfig;
