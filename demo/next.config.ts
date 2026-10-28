import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // rc9's package export maps the browser condition to its low-level loader,
    // bypassing the documented high-level API. Point the package root back to
    // index.js; its internal loader.node import is correctly replaced through
    // the package's browser map.
    config.resolve.alias["@quip.network/hashsigs-wasm$"] = path.resolve(
      process.cwd(),
      "node_modules/@quip.network/hashsigs-wasm/dist/index.js",
    );
    return config;
  },
};

export default nextConfig;
