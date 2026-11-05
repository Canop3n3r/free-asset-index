// Art Institute of Chicago Open Access (api.artic.edu), public-domain + image_id only → CC0.
// Link-only: items point at artic.edu object pages; previews via AIC IIIF (no rehost).
import { slugify } from '../lib.mjs';

export const ARTIC_QUERIES = [
  'textile', 'pattern', 'armor', 'sword', 'sculpture', 'ceramic', 'porcelain', 'mosaic',
  'tapestry', 'manuscript', 'illuminated', 'map', 'botanical', 'bird', 'insect', 'flower',
  'landscape', 'furniture', 'glass', 'metalwork', 'jewelry', 'coin', 'medal',
  'engraving', 'woodcut', 'drawing', 'watercolor', 'mask', 'costume',
  'architectural', 'tile', 'lacquer', 'ivory', 'jade', 'bronze', 'vessel', 'bowl', 'plate',
  'carpet', 'rug', 'calligraphy', 'stamp', 'photograph', 'print',
];

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'over', 'under', 'art', 'arts']);
const frag = s => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).slice(0, 4);

const iiif = (imageId, w) => `https://www.artic.edu/iiif/2/${encodeURIComponent(imageId)}/full/${w},/0/default.jpg`;

export function mapArtic(row) {
  if (!row || row.id == null) return null;
  if (row.is_public_domain !== true) return null;
  if (!row.image_id) return null;
  const title = clean(row.title);
  if (!title) return null;
  const creator = clean(row.artist_title) || 'Art Institute of Chicago';
  const thumb = iiif(row.image_id, 400);
  const image = iiif(row.image_id, 843);
  const tags = [
    'artic',
    ...frag(row.artwork_type_title),
    ...frag(row.department_title),
    ...frag(row.date_display),
  ].filter(Boolean).slice(0, 16);
  return {
    source: 'artic',
    sourceId: String(row.id),
    title,
    creator,
    creatorUrl: 'https://www.artic.edu/open-access',
    license: 'CC0',
    url: `https://www.artic.edu/artworks/${encodeURIComponent(row.id)}`,
    thumbnail: thumb,
    image,
    kind: '2d',
    style: 'realistic',
    formats: ['JPG'],
    tags,
    downloadUrl: image,
  };
}

const dedupKey = (title, creator) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${slugify(creator)}`;

// pages: per-query page count (100/page). Cap keeps combined items.json under deploy guard.
export async function crawlArtic({
  sleep, fetchImpl = fetch, log = console.log, queries = ARTIC_QUERIES, pages = 2, maxItems = 6000,
} = {}) {
  const out = new Map();
  const seenTitle = new Set();
  const UA = 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)';
  const fields = ['id', 'title', 'artist_title', 'image_id', 'is_public_domain', 'artwork_type_title', 'department_title', 'date_display'];
  for (const term of queries) {
    if (out.size >= maxItems) break;
    for (let p = 1; p <= pages; p++) {
      if (out.size >= maxItems) break;
      await sleep(500 + Math.floor(Math.random() * 200));
      const body = {
        q: term,
        query: {
          bool: {
            must: [
              { term: { is_public_domain: true } },
              { exists: { field: 'image_id' } },
            ],
          },
        },
        fields,
        limit: 100,
        page: p,
      };
      let r;
      let payload = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          r = await fetchImpl('https://api.artic.edu/api/v1/artworks/search', {
            method: 'POST',
            headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
          });
        } catch (e) {
          log(`artic ${term} p${p}: ${e.message}`);
          r = null;
        }
        if (r?.ok) {
          payload = await r.json();
          break;
        }
        const status = r?.status ?? 'err';
        log(`artic ${term} p${p}: HTTP ${status} (attempt ${attempt + 1})`);
        if (status === 403 || status === 429 || status === 'err') await sleep(1500 * (attempt + 1));
        else break;
      }
      if (!payload) break;
      const rows = payload.data || [];
      const totalPages = payload.pagination?.total_pages ?? p;
      for (const row of rows) {
        const it = mapArtic(row);
        if (!it || out.has(it.sourceId)) continue;
        if (seenTitle.has(dedupKey(it.title, it.creator))) it.title = `${it.title} (${it.sourceId})`;
        seenTitle.add(dedupKey(it.title, it.creator));
        out.set(it.sourceId, it);
        if (out.size >= maxItems) break;
      }
      log(`artic ${term} p${p}: ${out.size}`);
      if (!rows.length || p >= totalPages) break;
    }
  }
  return [...out.values()];
}
