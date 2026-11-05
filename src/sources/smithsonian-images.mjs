// Smithsonian Open Access (api.si.edu) 2D images, CC0 only (complements the 3D packages in smithsonian.mjs).
// Link-only: items point at the museum's object page; previews use the official IDS delivery service.
// Uses its own source id ('smithsonian-images') so 3D-only consumers of source 'smithsonian' (e.g. the Smithsonian 3D bundles) stay 3D.
// The api.data.gov key is sent as an X-Api-Key header, never in URLs, logs or output.
import { slugify } from '../lib.mjs';
export const SI_IMAGE_QUERIES = ['textile', 'wallpaper', 'pattern', 'ornament', 'poster', 'woodcut', 'engraving', 'drawing', 'watercolor', 'painting',
  'botanical', 'flower', 'bird', 'butterfly', 'insect', 'seashell', 'mineral', 'fossil', 'map', 'aircraft', 'locomotive', 'ship', 'armor', 'sword',
  'costume', 'furniture', 'ceramic', 'mask', 'coin', 'stamp', 'lettering', 'tile', 'lace', 'glass', 'clock', 'lamp', 'robot', 'rocket'];
const ids = u => (/^https:\/\/ids\.si\.edu\/ids\/deliveryService\?id=[^&]+$/.test(u || '') ? u : null);
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
export function mapSmithsonianImage(row) {
  const d = row.content?.descriptiveNonRepeating || {}, s = row.content?.indexedStructured || {};
  if (!d.record_ID || d.metadata_usage?.access !== 'CC0') return null;
  const m = (d.online_media?.media || []).find(x => x.type === 'Images' && x.usage?.access === 'CC0' && /^https:\/\//.test(x.content || ''));
  if (!m) return null;
  const res = m.resources || [];
  const base = ids(m.content) || ids(m.idsId);
  const thumb = base ? `${base}&max=400` : (/^https:\/\//.test(m.thumbnail || '') ? m.thumbnail : null);
  const hi = res.find(r => /High-resolution JPEG/i.test(r.label || ''))?.url;
  const link = /^https:\/\//.test(d.record_link || '') ? d.record_link : `https://www.si.edu/object/${encodeURIComponent(d.record_ID)}`;
  return {
    source: 'smithsonian-images', sourceId: d.record_ID, title: clean(row.title) || d.record_ID, creator: clean(d.data_source) || 'Smithsonian Institution',
    creatorUrl: 'https://www.si.edu/openaccess', license: 'CC0', url: link,
    thumbnail: thumb, image: base ? `${base}&max=1200` : null, kind: '2d', style: 'realistic', formats: ['JPG'],
    tags: ['smithsonian', 'image', ...(s.object_type || []).slice(0, 4), ...(s.topic || []).slice(0, 6)].map(clean).filter(Boolean),
    downloadUrl: /^https:\/\//.test(hi || '') ? hi : null,
  };
}
// Same normalization as the cross-source dedup key in src/quality.mjs (title + creator slug).
const dedupKey = (title, creator) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${slugify(creator)}`;
// reserved: dedup keys already used by other sources (e.g. the Smithsonian 3D packages) so an image never hides a 3D scan.
export async function crawlSmithsonianImages({ sleep, key, fetchImpl = fetch, log = console.log, queries = SI_IMAGE_QUERIES, pages = 3, reserved = [] }) {
  const out = new Map(), seenTitle = new Set(reserved);
  for (const term of queries) for (let p = 0; p < pages; p++) {
    await sleep(1000);
    const q = `${term} AND online_media_type:Images AND media_usage:CC0`;
    const r = await fetchImpl(`https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent(q)}&rows=100&start=${p * 100}`,
      { headers: { 'X-Api-Key': key, 'User-Agent': 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)' } });
    if (!r.ok) { log(`smithsonian-images ${term} p${p}: HTTP ${r.status}`); break; }
    const resp = (await r.json()).response || {};
    for (const row of resp.rows || []) {
      const it = mapSmithsonianImage(row); if (!it || out.has(it.sourceId)) continue;
      // Many objects share generic titles ("Textile"); disambiguate so cross-source dedup (title+creator) keeps them apart.
      if (seenTitle.has(dedupKey(it.title, it.creator))) it.title = `${it.title} (${it.sourceId.replace(/^[a-z]+_/, '')})`;
      seenTitle.add(dedupKey(it.title, it.creator));
      out.set(it.sourceId, it);
    }
    log(`smithsonian-images ${term} p${p}: ${out.size}`);
    if (!resp.rows?.length || (p + 1) * 100 >= resp.rowCount) break;
  }
  return [...out.values()];
}
