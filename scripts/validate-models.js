import validator from 'gltf-validator';
import { readFileSync, readdirSync } from 'node:fs';
let bad = 0;
for (const f of readdirSync('public/models').filter((f) => f.endsWith('.glb'))) {
  const r = await validator.validateBytes(new Uint8Array(readFileSync(`public/models/${f}`)));
  const { numErrors, numWarnings } = r.issues;
  console.log(`${f}: ${numErrors} errors, ${numWarnings} warnings`);
  if (numErrors) bad++;
}
process.exit(bad ? 1 : 0);
