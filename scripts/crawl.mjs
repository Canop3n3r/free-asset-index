// Polite crawler: builds data/items.json. Links only; never downloads asset files.
// Usage: node scripts/crawl.mjs [polyhaven quaternius opengameart kenney]
import { readFile, writeFile } from 'node:fs/promises';
import { normalizeItem } from '../src/lib.mjs';

const UA = 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, json = false) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return json ? r.json() : r.text();
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const detectFormats = text => ['GLB', 'GLTF', 'FBX', 'OBJ', 'BLEND', 'PNG'].filter(f => new RegExp(`\\b\\.?${f}\\b`, 'i').test(text));

async function polyhaven() {
  const all = await get('https://api.polyhaven.com/assets', true);
  const FMT = { 0: ['HDR', 'EXR'], 1: ['PNG', 'JPG', 'EXR'], 2: ['GLTF', 'FBX', 'BLEND'] };
  const KIND = { 0: 'hdri', 1: 'texture', 2: '3d' };
  return Object.entries(all).map(([id, a]) => ({
    source: 'polyhaven', sourceId: id, title: a.name, creator: Object.keys(a.authors || {}).join(', ') || 'Poly Haven',
    creatorUrl: null, license: 'CC0', url: `https://polyhaven.com/a/${id}`,
    thumbnail: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
    kind: KIND[a.type], style: 'realistic', formats: FMT[a.type], tags: [...(a.categories || []), ...(a.tags || [])],
  }));
}

async function quaternius() {
  const home = await get('https://quaternius.com/index.html');
  const blocks = home.split('class="hvr-sink"').slice(1);
  const out = [];
  for (const b of blocks) {
    const href = b.match(/href="\/packs\/([a-z0-9]+)\.html"/); if (!href) continue;
    const title = decode((b.match(/class="PackText">([^<]*)/) || [])[1] || href[1]);
    const tags = [...b.matchAll(/class="viewtag tags">([^<]*)/g)].map(m => decode(m[1]));
    const thumb = (b.match(/src="(\/assets\/images\/thumbnails\/[^"]+)"/) || [])[1];
    let formats = [];
    try { await sleep(1000); const page = await get(`https://quaternius.com/packs/${href[1]}.html`);
      formats = detectFormats((page.match(/name="description" content="([^"]*)"/) || [])[1] || '');
    } catch (e) { console.warn(e.message); }
    out.push({ source: 'quaternius', sourceId: href[1], title, creator: 'Quaternius', creatorUrl: 'https://quaternius.com/',
      license: 'CC0', url: `https://quaternius.com/packs/${href[1]}.html`, thumbnail: thumb ? `https://quaternius.com${thumb}` : null,
      kind: '3d', style: 'low-poly', formats, tags });
  }
  return out;
}

// OpenGameArt: robots.txt asks Crawl-delay: 10 -> we wait 10s between every request.
async function opengameart({ perCombo = Number(process.env.OGA_PER_COMBO || 12) } = {}) {
  const types = { 9: '2d', 10: '3d', 14: 'texture' };
  const lics = { 4: 'CC0', 2: 'CC-BY 3.0', 17981: 'CC-BY 4.0' };
  const out = [];
  for (const [tid, kind] of Object.entries(types)) for (const [lid, license] of Object.entries(lics)) {
    await sleep(10000);
    const list = await get(`https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=${tid}&field_art_licenses_tid%5B%5D=${lid}&items_per_page=24&sort_by=count&sort_order=DESC`);
    const slugs = [...new Set([...list.matchAll(/art-preview-title">\s*<a href="\/content\/([^"]+)">/g)].map(m => m[1]))].slice(0, perCombo);
    for (const slug of slugs) {
      if (out.some(o => o.sourceId === slug)) continue;
      await sleep(10000);
      try {
        const p = await get(`https://opengameart.org/content/${slug}`);
        const title = decode((p.match(/<h2[^>]*property="dc:title"[^>]*>([^<]*)/) || p.match(/<title>([^|<]*)/) || [])[1] || slug);
        const au = p.match(/field-name-author-submitter[\s\S]*?<a href="\/users\/([^"]+)">([^<]+)<\/a>/);
        const pageLics = [...p.matchAll(/license-name'>([^<]*)/g)].map(m => decode(m[1]));
        const lic = pageLics.find(l => ['CC0', 'CC-BY 3.0', 'CC-BY 4.0'].includes(l));
        if (!au || !lic) continue;
        const tags = [...(p.match(/field-name-field-art-tags[\s\S]*?<\/div><\/div><\/div>/) || [''])[0].matchAll(/>([^<>]+)<\/a>/g)].map(m => decode(m[1]));
        const thumb = (p.match(/\/sites\/default\/files\/styles\/medium\/public\/[^"' ]+/) || [])[0];
        const body = (p.match(/field-name-body[\s\S]*?<\/div><\/div><\/div>/) || [''])[0];
        const files = [...p.matchAll(/\/sites\/default\/files\/[^"' ]+\.(\w+)/g)].map(m => m[1]).join(' ');
        let formats = detectFormats(body + ' ' + tags.join(' ') + ' ' + files);
        if (kind !== '3d') formats = formats.filter(f => f === 'PNG');
        out.push({ source: 'opengameart', sourceId: slug, title, creator: decode(au[2]), creatorUrl: `https://opengameart.org/users/${au[1]}`,
          license: lic, url: `https://opengameart.org/content/${slug}`, thumbnail: thumb ? `https://opengameart.org${thumb}` : null,
          kind, style: /pixel/i.test(tags.join(' ') + title) ? 'pixel' : null, formats, tags });
        console.log('oga', out.length, slug);
      } catch (e) { console.warn(e.message); }
    }
  }
  return out;
}

// Kenney: kenney.nl robots.txt disallows /assets/ for crawlers, so we do NOT crawl it.
// Items come from a hand-curated seed file (data/kenney-seed.json). All Kenney assets are CC0.
async function kenney() {
  const seed = JSON.parse(await readFile(new URL('../data/kenney-seed.json', import.meta.url)));
  return seed.map(s => ({ source: 'kenney', sourceId: s.slug, title: s.title, creator: 'Kenney', creatorUrl: 'https://kenney.nl/',
    license: 'CC0', url: `https://kenney.nl/assets/${s.slug}`, thumbnail: null, kind: s.kind, style: s.style, formats: s.formats, tags: s.tags || [] }));
}

const SOURCES = { polyhaven, quaternius, opengameart, kenney };
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SOURCES);
const path = new URL('../data/items.json', import.meta.url);
let existing = []; try { existing = JSON.parse(await readFile(path)); } catch {}
for (const name of want) {
  const raw = await SOURCES[name]();
  const items = []; for (const r of raw) { try { items.push(normalizeItem(r)); } catch (e) { console.warn(name, r.sourceId, e.message); } }
  existing = existing.filter(i => i.source !== name).concat(items);
  await writeFile(path, JSON.stringify(existing, null, 1));
  console.log(name, items.length);
}
