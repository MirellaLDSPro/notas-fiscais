import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  allowedDevOrigins: ["192.168.15.2", "*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.app"],
  outputFileTracingIncludes: {
    "/api/upload": [
      "./node_modules/@napi-rs/canvas*/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
