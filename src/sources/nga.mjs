// National Gallery of Art Open Data (github.com/NationalGalleryOfArt/opendata), CC0 + openaccess images only.
// Link-only: items point at the NGA object page; previews use the NGA IIIF image server (resized JPGs).
const BASE = 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/';
const IIIF = 'https://api.nga.gov/iiif/';
// Classification -> max items (null = all). Prints/portfolios/volumes are skipped (mostly text pages).
export const NGA_CAPS = { Sculpture: null, 'Decorative Art': null, Painting: null, 'Index of American Design': 1500, Drawing: 1000 };

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();

export function eachCsv(text, fn) {
  let head = null, row = [], f = '', q = false;
  const end = () => {
    row.push(f); f = '';
    if (!head) head = row;
    else if (row.length === head.length) fn(Object.fromEntries(head.map((h, i) => [h, row[i]])));
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') end();
    else if (c !== '\r') f += c;
  }
  if (f || row.length) end();
}
export function parseCsv(text) { const out = []; eachCsv(text, r => out.push(r)); return out; }

export function mapNga(obj, img) {
  if (!obj || !img || !obj.objectid) return null;
  if (String(img.openaccess) !== '1') return null;
  const uuid = clean(img.iiifurl).replace(IIIF, '');
  if (!/^[0-9a-f-]{36}$/.test(uuid)) return null;
  const title = clean(obj.title);
  if (!title) return null;
  const tag = s => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const tags = ['nga', 'national gallery of art', tag(obj.classification), tag(obj.subclassification), ...tag(obj.medium).split(' ').filter(w => w.length > 3)].filter(Boolean).slice(0, 14);
  return {
    source: 'nga',
    sourceId: String(obj.objectid),
    title,
    creator: clean(obj.attribution) || 'National Gallery of Art',
    creatorUrl: 'https://github.com/NationalGalleryOfArt/opendata',
    license: 'CC0',
    url: `https://www.nga.gov/collection/art-object-page.${obj.objectid}.html`,
    thumbnail: `${IIIF}${uuid}/full/!400,400/0/default.jpg`,
    image: `${IIIF}${uuid}/full/!1200,1200/0/default.jpg`,
    kind: '2d',
    style: 'realistic',
    formats: ['JPG'],
    tags,
    downloadUrl: `${IIIF}${uuid}/full/!1200,1200/0/default.jpg`,
  };
}

export async function crawlNga({ get, log = console.log, caps = NGA_CAPS } = {}) {
  const imgs = new Map();
  eachCsv(await get(BASE + 'published_images.csv'), r => {
    if (r.openaccess === '1' && r.viewtype === 'primary' && r.depictstmsobjectid && !imgs.has(r.depictstmsobjectid)) imgs.set(r.depictstmsobjectid, { iiifurl: r.iiifurl, openaccess: r.openaccess });
  });
  log(`nga open-access primary images: ${imgs.size}`);
  const byClass = {};
  eachCsv(await get(BASE + 'objects.csv'), o => {
    if (!(o.classification in caps) || !imgs.has(o.objectid)) return;
    (byClass[o.classification] ||= []).push({ objectid: o.objectid, title: o.title, attribution: o.attribution, classification: o.classification, subclassification: o.subclassification, medium: o.medium });
  });
  const out = []; const seen = new Set();
  for (const [cls, list] of Object.entries(byClass)) {
    const cap = caps[cls];
    list.sort((a, b) => Number(a.objectid) - Number(b.objectid));
    const n = cap && list.length > cap ? cap : list.length;
    const step = list.length / n;
    for (let k = 0; k < n; k++) {
      const o = list[Math.floor(k * step)];
      const it = mapNga(o, imgs.get(o.objectid));
      if (!it) continue;
      const key = it.title.toLowerCase() + '|' + it.creator.toLowerCase();
      if (seen.has(key)) it.title = `${it.title} (${it.sourceId})`;
      seen.add(key);
      out.push(it);
    }
    log(`nga ${cls}: ${list.length} eligible`);
  }
  return out;
}
