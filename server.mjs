// Dockerized server: serves dist/ plus a live JSON search API.
import { createServer } from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { search, creatorStats } from './src/lib.mjs';
import { classify } from './src/classify.mjs';
import { buildBundles, bundleIndex } from './src/bundles.mjs';
import { engineManifest, ENGINES } from './src/engines.mjs';

const DIST = new URL('./dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

/** Load a full item array, or stitch api/source shards from an items-manifest. */
export async function loadItemsFromPath(itemsPath) {
  const raw = JSON.parse(await readFile(itemsPath));
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.shards)) {
    throw new Error(`itemsPath must be an item array or items-manifest with shards: ${itemsPath}`);
  }
  const base = dirname(itemsPath);
  const items = [];
  for (const s of raw.shards) {
    const rel = String(s.path || '').replace(/^api\//, '');
    if (!rel || rel.includes('..')) throw new Error(`bad shard path: ${s.path}`);
    const part = JSON.parse(await readFile(join(base, rel)));
    if (!Array.isArray(part)) throw new Error(`shard not an array: ${rel}`);
    items.push(...part);
  }
  return items;
}

export async function makeServer({ itemsPath = join(DIST, 'api/items.json'), statsFile = process.env.STATS_FILE || null } = {}) {
  const items = (await loadItemsFromPath(itemsPath)).map(i => (i.categories ? i : { ...i, ...classify(i) }));
  const bundles = buildBundles(items);
  const stats = {};
  const json = (res, code, d) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(d)); };
  return createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }); return res.end(); }
    if (u.pathname === '/api/search') return json(res, 200, search(items, Object.fromEntries(u.searchParams)));
    if (u.pathname === '/api/bundles' || u.pathname === '/api/bundles.json') return json(res, 200, bundleIndex(bundles));
    const bm = u.pathname.match(/^\/api\/bundles\/([a-z0-9-]+?)(?:\.(godot|unity|threejs))?(\.json)?$/);
    if (bm) { const b = bundles.find(x => x.slug === bm[1]); if (!b) return json(res, 404, { error: 'no such bundle' }); return json(res, 200, bm[2] ? engineManifest(b, bm[2]) : b); }
    if (u.pathname === '/api/creators') return json(res, 200, creatorStats(items));
    if (u.pathname === '/api/stats') return json(res, 200, stats);
    if (u.pathname === '/api/track' && req.method === 'POST') {
      let body = ''; for await (const c of req) { body += c; if (body.length > 2000) return json(res, 413, { error: 'too large' }); }
      try {
        const e = JSON.parse(body); if (!['view', 'click'].includes(e.type) || typeof e.creator !== 'string') throw 0;
        const s = stats[e.creator] ||= { views: 0, clicks: 0 }; s[e.type === 'click' ? 'clicks' : 'views']++;
        if (statsFile) await appendFile(statsFile, JSON.stringify({ type: e.type, creator: e.creator, item: e.item ?? null, t: Date.now() }) + '\n');
        return json(res, 204, {});
      } catch { return json(res, 400, { error: 'bad event' }); }
    }
    let p = normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p.endsWith('/')) p += 'index.html';
    try { const data = await readFile(join(DIST, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(data); }
    catch { res.writeHead(404); res.end('not found'); }
  });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 8080);
  (await makeServer()).listen(port, () => console.log(`free-asset-index on http://localhost:${port}`));
}
