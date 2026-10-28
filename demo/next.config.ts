import type { NextConfig } from "next";
import path from "node:path";

// WORKAROUND: package "exports" -> "browser" condition resolves to a low-level loader
// without loadHashSigs. Force the high-level entry instead.
const entry = "node_modules/@quip.network/hashsigs-wasm/dist/profiles/256s-keccak/index.js";

const nextConfig: NextConfig = {
  // Keep the wasm package out of the server bundle so Node loads it (and its .wasm) from node_modules.
  serverExternalPackages: ["@quip.network/hashsigs-wasm"],
  turbopack: {
    resolveAlias: {
      "@quip.network/hashsigs-wasm": { browser: "./" + entry },
    },
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias["@quip.network/hashsigs-wasm$"] = path.resolve(entry);
    }
    return config;
  },
};

export default nextConfig;
