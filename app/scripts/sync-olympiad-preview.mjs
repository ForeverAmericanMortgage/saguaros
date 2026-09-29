import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../', import.meta.url));
const destination = fileURLToPath(new URL('../../olympiad-public-preview/', import.meta.url));
await cp(`${source}/src/app/olympiad`, `${destination}/src/app/olympiad`, { recursive: true });
await cp(`${source}/public/olympiad`, `${destination}/public/olympiad`, { recursive: true });
console.log('Synced Olympiad presentation components and public assets only.');
