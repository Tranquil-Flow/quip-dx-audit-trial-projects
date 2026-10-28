import fs from 'node:fs';
import { TypeRegistry, Metadata } from '@polkadot/types';

const hex = fs.readFileSync('/tmp/meta_patched_v14.hex', 'utf8').trim();
const registry = new TypeRegistry();
const meta = new Metadata(registry, hex);
console.log('meta.constructor.name:', meta.constructor.name);
console.log('asLatest type:', meta.asLatest?.constructor?.name);
console.log('keys of asLatest:', Object.keys(meta.asLatest ?? {}).join(', '));
console.log('keys of meta:', Object.keys(meta).join(', '));
console.log('metadataType:', meta.metadataType);
