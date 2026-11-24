// Wellcome Collection images (api.wellcomecollection.org catalogue v2), CC0 + CC-BY 4.0 only.
// Link-only: items point at the Wellcome work page; previews use the Wellcome IIIF image server.
const API = 'https://api.wellcomecollection.org/catalogue/v2/images';
const IIIF = 'https://iiif.wellcomecollection.org/image/';
export const WELLCOME_QUERIES = ['botanical', 'anatomy', 'map', 'alchemy', 'ornament', 'pattern', 'creature', 'monster', 'costume', 'architecture', 'weapon', 'ship', 'mythology', 'dragon', 'skeleton', 'demon', 'plant', 'animal', 'insect', 'bird', 'fish', 'medieval', 'armour', 'skull', 'symbol', 'zodiac', 'astronomy', 'herbal', 'devil', 'witch'];
export const WELLCOME_CAP = 4000;
const LICENSES = { cc0: 'CC0', 'cc-by': 'CC-BY 4.0' };
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

export function mapWellcome(r, query = '') {
  if (!r || r.type !== 'Image' || !r.id) return null;
  const loc = (r.locations || []).find(l => l && l.license && LICENSES[l.license.id] && /^https:\/\/iiif\.wellcomecollection\.org\/image\/[^/]+\/info\.json$/.test(l.url || ''));
  if (!loc) return null;
  const work = r.source && r.source.id; let title = clean(r.source && r.source.title); if (title.length > 140) title = title.slice(0, 137).replace(/\s+\S*$/, '') + '…';
  if (!work || !title) return null;
  const imgId = loc.url.slice(IIIF.length).replace('/info.json', '');
  const license = LICENSES[loc.license.id];
  const tags = ['wellcome', 'wellcome collection', query, ...title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 3)].filter(Boolean);
  return {
    source: 'wellcome',
    sourceId: String(r.id),
    title,
    creator: clean(loc.credit) || 'Wellcome Collection',
    creatorUrl: 'https://wellcomecollection.org/collections',
    license,
    url: `https://wellcomecollection.org/works/${work}`,
    thumbnail: `${IIIF}${imgId}/full/!400,400/0/default.jpg`,
    image: `${IIIF}${imgId}/full/!1200,1200/0/default.jpg`,
    kind: '2d',
    style: 'realistic',
    formats: ['JPG'],
    tags: [...new Set(tags)].slice(0, 14),
    downloadUrl: `${IIIF}${imgId}/full/!1200,1200/0/default.jpg`,
  };
}

export async function crawlWellcome({ get, sleep = async () => {}, log = console.log, queries = WELLCOME_QUERIES, cap = WELLCOME_CAP, perQuery = Math.ceil(cap / 10) } = {}) {
  const out = []; const seen = new Set(); const seenWork = new Set();
  for (const q of queries) {
    let got = 0;
    for (let page = 1; out.length < cap && got < perQuery; page++) {
      const j = await get(`${API}?query=${encodeURIComponent(q)}&locations.license=cc-by,cc0&pageSize=100&page=${page}`, true);
      await sleep(350);
      for (const r of j.results || []) {
        const it = mapWellcome(r, q);
        if (!it || seen.has(it.sourceId) || seenWork.has(it.url)) continue;
        seen.add(it.sourceId); seenWork.add(it.url); out.push(it); got++;
        if (out.length >= cap || got >= perQuery) break;
      }
      if (!j.nextPage || !(j.results || []).length) break;
    }
    log(`wellcome ${q}: +${got} (total ${out.length})`);
    if (out.length >= cap) break;
  }
  return out;
}
