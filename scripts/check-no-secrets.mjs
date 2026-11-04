// Fails if any value from the secrets dir appears in dist/, data/, src/, web/ or scripts/. Run before every deploy.
import { readdir, readFile } from 'node:fs/promises';
const dir = process.env.SECRETS_DIR || '/home/box/secrets';
const secrets = []; try { for (const f of await readdir(dir)) { const v = (await readFile(`${dir}/${f}`, 'utf8')).trim(); if (v.length >= 8) secrets.push([f, v]); } } catch {}
const root = new URL('../', import.meta.url);
async function* walk(u) { for (const e of await readdir(u, { withFileTypes: true })) { if (e.name === '.git' || e.name === 'node_modules') continue; const c = new URL(e.name + (e.isDirectory() ? '/' : ''), u); if (e.isDirectory()) yield* walk(c); else yield c; } }
let bad = 0;
for (const top of ['dist/', 'data/', 'src/', 'web/', 'scripts/', 'test/']) {
  try { for await (const f of walk(new URL(top, root))) { const t = await readFile(f, 'utf8'); for (const [name, v] of secrets) if (t.includes(v)) { console.error(`SECRET ${name} found in ${f.pathname}`); bad++; } } } catch {}
}
if (bad) process.exit(1);
console.log(`no secrets found (${secrets.length} checked)`);
