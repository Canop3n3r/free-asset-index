// Builds the static site + static JSON API into dist/ (the folder GitHub Pages serves).
import { readFile, writeFile, mkdir, cp, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { previewFor } from '../src/previews.mjs';
import { slimItem } from '../src/slim.mjs';
import { engineManifest, ENGINES } from '../src/engines.mjs';
import { CATEGORIES } from '../src/classify.mjs';
import { creatorStats } from '../src/lib.mjs';
import { classify } from '../src/classify.mjs';
import { dedup, qualityScore } from '../src/quality.mjs';
import { buildBundles, bundleIndex } from '../src/bundles.mjs';
import { MAX_PUBLISHED_JSON_BYTES } from '../src/publish-limits.mjs';

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

const bySource = {};
for (const i of items) (bySource[i.source] ||= []).push(i);
const sources = Object.keys(bySource).sort();
const shards = [];
for (const s of sources) {
  await w(`api/source/${s}.json`, bySource[s]);
  shards.push({ source: s, path: `source/${s}.json`, count: bySource[s].length });
}

// Pointer only — never publish the full dataset as one file (was ~75 MB and growing).
await w('api/items.json', {
  schema: 'free-asset-index/items-manifest/v1',
  total: items.length,
  note: 'Full records are sharded by source under api/source/<name>.json. Use api/search-index.json for the browser index. This file is a small manifest, not an item array.',
  searchIndex: 'search-index.json',
  meta: 'meta.json',
  shards,
});

await w('api/search-index.json', items.map(slimItem));
await w('api/creators.json', creatorStats(items));
const count = k => items.reduce((m, i) => (m[i[k]] = (m[i[k]] || 0) + 1, m), {});
await w('api/meta.json', { total: items.length, bySource: count('source'), byLicense: count('license'), builtAt: new Date().toISOString(), note: 'Link-only index. Check the license on each source page.' });
for (const l of ['CC0', 'CC-BY']) await w(`api/license/${l.toLowerCase()}.json`, items.filter(i => i.license.startsWith(l)));
for (const f of ['GLB', 'GLTF', 'FBX', 'OBJ', 'BLEND', 'PNG', 'HDR', 'SVG']) await w(`api/format/${f.toLowerCase()}.json`, items.filter(i => i.formats.includes(f) || (f === 'GLB' && i.formats.includes('GLTF'))));
const bundles = buildBundles(items);
await w('api/bundles.json', bundleIndex(bundles));
for (const b of bundles) { await w(`api/bundles/${b.slug}.json`, b); for (const e of ENGINES) await w(`api/bundles/${b.slug}.${e}.json`, engineManifest(b, e)); }
console.log('bundles:', bundles.map(b => `${b.slug}=${b.count}`).join(' '));
await writeFile(new URL('.nojekyll', out), '');

const oversized = [];
async function walkJson(dir, rel = '') {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walkJson(p, r);
    else if (e.name.endsWith('.json')) {
      const { size } = await stat(p);
      if (size > MAX_PUBLISHED_JSON_BYTES) oversized.push({ path: r, size });
    }
  }
}
await walkJson(new URL('api/', out).pathname, 'api');
if (oversized.length) {
  for (const o of oversized) console.error(`PUBLISHED JSON TOO LARGE: ${o.path} is ${o.size} bytes (max ${MAX_PUBLISHED_JSON_BYTES})`);
  process.exit(1);
}
console.log(`built ${items.length} items -> ${out.pathname}`);
