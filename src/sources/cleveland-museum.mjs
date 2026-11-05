// Cleveland Museum of Art Open Access (openaccess-api.clevelandart.org), CC0 + image only.
// Link-only: items point at the museum object page; previews use openaccess-cdn JPGs (web/print).
import { slugify } from '../lib.mjs';

export const CLEVELAND_QUERIES = [
  'textile', 'pattern', 'armor', 'sword', 'sculpture', 'ceramic', 'porcelain', 'mosaic',
  'tapestry', 'manuscript', 'illuminated', 'map', 'botanical', 'bird', 'insect', 'flower',
  'landscape', 'portrait miniature', 'furniture', 'glass', 'metalwork', 'jewelry', 'coin',
  'medal', 'engraving', 'woodcut', 'drawing', 'watercolor', 'mask', 'costume',
  'architectural', 'tile', 'lacquer', 'ivory', 'jade', 'bronze', 'vessel', 'bowl', 'plate',
  'carpet', 'rug', 'calligraphy', 'stamp', 'photograph landscape', 'photograph architecture',
];

const https = u => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const shortCreator = c => {
  const d = clean(c?.description);
  if (!d) return null;
  // "Henri Rousseau (French, 1844–1910)" -> "Henri Rousseau"
  return clean(d.replace(/\s*\([^)]*\)\s*$/, '')) || d.slice(0, 80);
};
const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'over', 'under', 'art', 'arts']);
const frag = s => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).slice(0, 4);

export function mapCleveland(row) {
  if (!row || row.id == null) return null;
  if (row.share_license_status !== 'CC0') return null;
  const title = clean(row.title);
  if (!title) return null;
  const web = https(row.images?.web?.url);
  const print = https(row.images?.print?.url);
  if (!web && !print) return null;
  // Prefer JPG web/print; skip TIFF-only full.
  const thumb = web || print;
  const image = print || web;
  const fmtUrl = (print || web || '').toLowerCase();
  const formats = /\.png(\?|$)/.test(fmtUrl) ? ['PNG'] : ['JPG'];
  const creator = shortCreator(row.creators?.[0]) || 'Cleveland Museum of Art';
  const url = https(row.url) || `https://www.clevelandart.org/art/${encodeURIComponent(row.accession_number || row.id)}`;
  const tags = [
    'cleveland',
    ...frag(row.type),
    ...frag(row.department),
    ...frag(row.technique),
  ].filter(Boolean).slice(0, 16);
  return {
    source: 'cleveland-museum',
    sourceId: String(row.id),
    title,
    creator,
    creatorUrl: 'https://www.clevelandart.org/open-access',
    license: 'CC0',
    url,
    thumbnail: thumb,
    image,
    kind: '2d',
    style: 'realistic',
    formats,
    tags,
    downloadUrl: print || web,
  };
}

const dedupKey = (title, creator) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${slugify(creator)}`;

// pages: per-query page count (100/page). Cap keeps JSON under ~12MB while covering game-useful terms.
export async function crawlCleveland({
  sleep, fetchImpl = fetch, log = console.log, queries = CLEVELAND_QUERIES, pages = 2, maxItems = 7000,
} = {}) {
  const out = new Map();
  const seenTitle = new Set();
  const UA = 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)';
  for (const term of queries) {
    if (out.size >= maxItems) break;
    for (let p = 0; p < pages; p++) {
      if (out.size >= maxItems) break;
      await sleep(700);
      const url = `https://openaccess-api.clevelandart.org/api/artworks/?cc0=1&has_image=1&q=${encodeURIComponent(term)}&limit=100&skip=${p * 100}`;
      let r;
      try {
        r = await fetchImpl(url, { headers: { 'User-Agent': UA } });
      } catch (e) {
        log(`cleveland-museum ${term} p${p}: ${e.message}`);
        break;
      }
      if (!r.ok) { log(`cleveland-museum ${term} p${p}: HTTP ${r.status}`); break; }
      const body = await r.json();
      const rows = body.data || [];
      const total = body.info?.total ?? 0;
      for (const row of rows) {
        const it = mapCleveland(row);
        if (!it || out.has(it.sourceId)) continue;
        // Disambiguate generic titles so cross-source dedup (title+creator) keeps distinct objects.
        if (seenTitle.has(dedupKey(it.title, it.creator))) it.title = `${it.title} (${it.sourceId})`;
        seenTitle.add(dedupKey(it.title, it.creator));
        out.set(it.sourceId, it);
        if (out.size >= maxItems) break;
      }
      log(`cleveland-museum ${term} p${p}: ${out.size}`);
      if (!rows.length || (p + 1) * 100 >= total) break;
    }
  }
  return [...out.values()];
}
