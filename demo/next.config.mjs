export default {
  serverExternalPackages: ['@quip.network/hashsigs-wasm'],
  // Workaround: the package's "browser" export condition omits loadHashSigs/makeHashSigs,
  // so alias the internal api module (makeHashSigs) for the client bundle.
  turbopack: { resolveAlias: { 'hashsigs-api': './node_modules/@quip.network/hashsigs-wasm/dist/api.js' } },
};
