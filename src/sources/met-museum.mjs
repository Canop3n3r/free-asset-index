// Metropolitan Museum of Art Collection API — Open Access (CC0) images only (link-only; never rehost).
// Search: GET /public/collection/v1.1/search (paginated). Detail: GET /public/collection/v1/objects/{id}.
// Keep only isPublicDomain === true with a non-empty primaryImage (Met's Open Access / CC0 image set).
// API docs: https://metmuseum.github.io/ — no key; polite rate limit well under their 80 rps guidance.
import { slugify } from '../lib.mjs';

export const MET_QUERIES = [
  'armor', 'sword', 'sculpture', 'ceramic', 'porcelain', 'textile', 'tapestry', 'mosaic',
  'manuscript', 'map', 'botanical', 'bird', 'insect', 'flower', 'landscape', 'furniture',
  'glass', 'metalwork', 'jewelry', 'coin', 'medal', 'engraving', 'woodcut', 'drawing',
  'watercolor', 'mask', 'costume', 'architectural', 'tile', 'lacquer', 'ivory', 'jade',
  'bronze', 'vessel', 'bowl', 'plate', 'carpet', 'rug', 'calligraphy', 'stamp',
  'photograph', 'print', 'helmet', 'shield', 'dagger', 'relief', 'statue', 'vase',
];

const UA = 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)';
const SEARCH = 'https://collectionapi.metmuseum.org/public/collection/v1.1/search';
const OBJECT = 'https://collectionapi.metmuseum.org/public/collection/v1/objects';

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'over', 'under', 'art', 'arts']);
const frag = s => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).slice(0, 4);
const https = u => (typeof u === 'string' && /^https:\/\//.test(u) ? u : null);

export function mapMet(row) {
  if (!row || row.objectID == null) return null;
  if (row.isPublicDomain !== true) return null;
  const image = https(row.primaryImage);
  const thumb = https(row.primaryImageSmall) || image;
  if (!image && !thumb) return null;
  const title = clean(row.title);
  if (!title) return null;
  const creator = clean(row.artistDisplayName) || 'The Metropolitan Museum of Art';
  const id = String(row.objectID);
  const url = https(row.objectURL) || `https://www.metmuseum.org/art/collection/search/${encodeURIComponent(id)}`;
  const tags = [
    'met',
    ...frag(row.objectName),
    ...frag(row.classification),
    ...frag(row.department),
    ...frag(row.culture),
    ...frag(row.period),
    ...((row.tags || []).map(t => (typeof t === 'string' ? t : t?.term)).flatMap(frag)),
  ].filter(Boolean).slice(0, 16);
  return {
    source: 'met-museum',
    sourceId: id,
    title,
    creator,
    creatorUrl: 'https://www.metmuseum.org/about-the-met/policies-and-documents/image-resources',
    license: 'CC0',
    url,
    thumbnail: thumb || image,
    image: image || thumb,
    kind: '2d',
    style: 'realistic',
    formats: ['JPG'],
    tags,
    downloadUrl: image || thumb,
  };
}

const dedupKey = (title, creator) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${slugify(creator)}`;

async function fetchJson(fetchImpl, url, log, label) {
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.ok) return await r.json();
      lastErr = `HTTP ${r.status}`;
      if (r.status === 429 || r.status >= 500) {
        // caller sleeps between attempts via passed sleep in crawl
        await new Promise(res => setTimeout(res, 800 * (attempt + 1)));
        continue;
      }
      log?.(`${label}: ${lastErr}`);
      return null;
    } catch (e) {
      lastErr = e.message;
      await new Promise(res => setTimeout(res, 800 * (attempt + 1)));
    }
  }
  log?.(`${label}: ${lastErr}`);
  return null;
}

/**
 * pages: search pages per query (limit 500/page). maxItems caps kept Open Access images.
 * concurrency: parallel object detail fetches (stay well under Met's 80 rps guidance).
 */
export async function crawlMetMuseum({
  sleep, fetchImpl = fetch, log = console.log,
  queries = MET_QUERIES, pages = 2, maxItems = 8000,
  concurrency = 4, searchLimit = 500,
} = {}) {
  const out = new Map();
  const seenTitle = new Set();
  const pending = [];
  const pendingSet = new Set();
  const idBudget = Math.ceil(maxItems * 1.15);

  for (const term of queries) {
    if (pending.length >= idBudget) break;
    for (let p = 0; p < pages; p++) {
      if (pending.length >= idBudget) break;
      await sleep(250);
      const offset = p * searchLimit;
      const url = `${SEARCH}?q=${encodeURIComponent(term)}&isPublicDomain=true&hasImages=true&limit=${searchLimit}&offset=${offset}`;
      const payload = await fetchJson(fetchImpl, url, log, `met-museum search ${term} p${p}`);
      if (!payload) break;
      const ids = payload.objectIDs || [];
      const total = payload.total ?? 0;
      for (const id of ids) {
        const sid = String(id);
        if (pendingSet.has(sid)) continue;
        pendingSet.add(sid);
        pending.push(id);
        if (pending.length >= idBudget) break;
      }
      log(`met-museum search ${term} p${p}: queued ${pending.length} (total~${total})`);
      if (!ids.length || offset + ids.length >= total) break;
    }
  }

  const ids = pending;
  let i = 0;
  async function worker() {
    while (i < ids.length && out.size < maxItems) {
      const idx = i++;
      const id = ids[idx];
      await sleep(200);
      const row = await fetchJson(fetchImpl, `${OBJECT}/${id}`, log, `met-museum object ${id}`);
      const it = mapMet(row);
      if (!it || out.has(it.sourceId)) continue;
      if (seenTitle.has(dedupKey(it.title, it.creator))) it.title = `${it.title} (${it.sourceId})`;
      seenTitle.add(dedupKey(it.title, it.creator));
      out.set(it.sourceId, it);
      if (out.size % 200 === 0) log(`met-museum details: ${out.size}/${ids.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  log(`met-museum done: ${out.size}`);
  return [...out.values()];
}
