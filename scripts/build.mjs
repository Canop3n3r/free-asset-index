// Builds the static site + static JSON API into dist/ (the folder GitHub Pages serves).
import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { previewFor } from '../src/previews.mjs';
import { creatorStats } from '../src/lib.mjs';
import { classify } from '../src/classify.mjs';
import { dedup, qualityScore } from '../src/quality.mjs';
import { buildBundles, bundleIndex } from '../src/bundles.mjs';
const root = new URL('../', import.meta.url);
const out = new URL(process.env.OUT_DIR || 'dist/', root);
let rawItems = JSON.parse(await readFile(new URL('data/items.json', root)));
// Extra sources live in data/sources/*.json (separate files so concurrent crawls never overwrite each other).
for (const f of (await readdir(new URL('data/sources/', root)).catch(() => [])).filter(f => f.endsWith('.json'))) {
  const extra = JSON.parse(await readFile(new URL(`data/sources/${f}`, root)));
  const ids = new Set(extra.map(i => i.id)); rawItems = rawItems.filter(i => !ids.has(i.id)).concat(extra);
}
const items = dedup(rawItems).map(i => ({ ...i, ...classify(i), quality: qualityScore(i), image: previewFor(i) }));
await rm(out, { recursive: true, force: true });
await cp(new URL('web/', root), out, { recursive: true });
await cp(new URL('src/lib.mjs', root), new URL('lib.mjs', out));
const w = async (p, d) => { const u = new URL(p, out); await mkdir(new URL('./', u), { recursive: true }); await writeFile(u, JSON.stringify(d)); };
await w('api/items.json', items);
await w('api/creators.json', creatorStats(items));
const count = k => items.reduce((m, i) => (m[i[k]] = (m[i[k]] || 0) + 1, m), {});
await w('api/meta.json', { total: items.length, bySource: count('source'), byLicense: count('license'), builtAt: new Date().toISOString(), note: 'Link-only index. Check the license on each source page.' });
for (const s of [...new Set(items.map(i => i.source))]) await w(`api/source/${s}.json`, items.filter(i => i.source === s));
for (const l of ['CC0', 'CC-BY']) await w(`api/license/${l.toLowerCase()}.json`, items.filter(i => i.license.startsWith(l)));
for (const f of ['GLB', 'GLTF', 'FBX', 'OBJ', 'BLEND', 'PNG', 'HDR']) await w(`api/format/${f.toLowerCase()}.json`, items.filter(i => i.formats.includes(f) || (f === 'GLB' && i.formats.includes('GLTF'))));
const bundles = buildBundles(items);
await w('api/bundles.json', bundleIndex(bundles));
for (const b of bundles) await w(`api/bundles/${b.slug}.json`, b);
console.log('bundles:', bundles.map(b => `${b.slug}=${b.count}`).join(' '));
await writeFile(new URL('.nojekyll', out), '');
console.log(`built ${items.length} items -> ${out.pathname}`);
