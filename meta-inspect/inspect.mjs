import fs from 'node:fs';
import { TypeRegistry, Metadata } from '@polkadot/types';

const hex = fs.readFileSync('/tmp/meta_patched_v14.hex', 'utf8').trim();
const registry = new TypeRegistry();
const meta = new Metadata(registry, hex);
const latest = meta.asLatest;

console.log('metadata version:', latest.version.toNumber());
console.log('specName:', meta.asLatest?.system?.chain?.toString?.() ?? 'n/a');

// signed extensions
console.log('\n== signed extensions ==');
for (const e of latest.extrinsic.signedExtensions) {
  const id = e.identifier.toString();
  const ty = registry.createLookupType(e.type);
  const add = e.additionalSigned.isSome ? e.additionalSigned.unwrap().toString() : '-';
  console.log(`- ${id}: type=${ty.type} additionalSigned=${add}`);
}

// extrinsic type
console.log('\n== extrinsic type ==');
const extTy = registry.createLookupType(latest.extrinsic.ty);
console.log('extrinsic ty id', latest.extrinsic.ty.toNumber(), '->', JSON.stringify(registry.lookup.getTypeDef(latest.extrinsic.ty.toNumber()), null, 1).slice(0, 3000));
console.log('extrinsic version:', latest.extrinsic.version.toNumber());

// address type
console.log('\n== address & signature types ==');
const t = registry.lookup.getTypeDef(latest.extrinsic.ty.toNumber());
console.log(JSON.stringify(t, null, 1));

// find Balances pallet calls
console.log('\n== Balances pallet ==');
for (const p of latest.pallets) {
  const name = p.name.toString();
  if (name === 'Balances') {
    console.log('index:', p.index.toNumber());
    if (p.calls.isSome) {
      const calls = registry.createLookupType(p.calls.unwrap().type);
      console.log('calls type:', calls.type);
      const td = registry.lookup.getTypeDef(p.calls.unwrap().type.toNumber());
      for (const v of td.sub ?? []) {
        const f = registry.lookup.getSiType(v.type).def.asVariant.fields;
        const args = f.map((x) => registry.createLookupType(x.type).type).join(', ');
        console.log(`  call ${v.index}: ${v.name} (${args})`);
      }
    }
  }
}

// System pallet storage Account
console.log('\n== System storage Account ==');
for (const p of latest.pallets) {
  if (p.name.toString() === 'System' && p.storage.isSome) {
    const td = registry.lookup.getTypeDef(p.storage.unwrap().type.toNumber());
    for (const entry of td.sub ?? []) {
      console.log(`  ${entry.name}: ${registry.createLookupType(entry.type).type}`);
    }
  }
}
