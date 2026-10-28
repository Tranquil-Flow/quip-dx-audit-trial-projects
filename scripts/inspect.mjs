import { loadContext, ensureQuipWallet } from './setup.mjs';

try {
  const ctx = await loadContext();
  console.log('Omnibus:', ctx.deployment.omnibusAddress, 'version:', String(await ctx.omnibus.getVersion()), 'commit fee wei:', String(await ctx.omnibus.getCommitmentFee()));
  const wallet = await ensureQuipWallet(ctx);
  console.log('Quip wallet state:', JSON.stringify(await wallet.getWalletState(), (_, v) => typeof v === 'bigint' ? v.toString() : v));
} catch (error) {
  console.error('Account setup failed:', error.name, error.code ?? '', error.message);
  process.exitCode = 1;
}
