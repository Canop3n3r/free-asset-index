// ShareTextures.com free CC0 PBR textures, atlases and 3D models (link-only; never rehost).
// Asset list from the public sitemap (robots.txt allows asset pages; /api is disallowed and not used).
// Each asset page's embedded Next.js data gives title, licence, category, tags, preview image and resolution.
// Only items whose own licence field is exactly "CC0" and that are not early-access are kept; paid /products are skipped.
const SITEMAP = 'https://www.sharetextures.com/sitemap_assets.xml';
const IMG = 'https://images.sharetextures.com/';
const TYPES = { textures: ['texture', []], atlases: ['texture', []], models: ['3d', []] };
const FMT = { blender: 'BLEND', fbx: 'FBX', obj: 'OBJ', glb: 'GLB', gltf: 'GLTF' };

export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*(https:\/\/www\.sharetextures\.com\/([a-z]+)\/[^<\s]+?)\s*<\/loc>/g)]
    .filter(m => TYPES[m[2]]).map(m => m[1]);
}

export function extractDetail(html) {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(String(html));
  if (!m) return null;
  try { return JSON.parse(m[1])?.props?.pageProps?.itemDetail?.data || null; } catch { return null; }
}

const img = k => (typeof k === 'string' && /^[\w./-]+$/.test(k) ? IMG + k : null);

export function mapShareTextures(d, url) {
  if (!d || d.text1Licence !== 'CC0' || d.isEarlyAccess) return null;
  const type = /sharetextures\.com\/([a-z]+)\//.exec(url || '')?.[1];
  const t = TYPES[type]; if (!t || !d.slug || !d.title) return null;
  const p = d.previewImage1 || {};
  const author = (d.authors || []).map(a => a?.author?.name).find(Boolean);
  const creator = author ? `${author.firstName || ''} ${author.lastName || ''}`.trim() + ' / ShareTextures' : 'ShareTextures';
  const formats = (d.downloadLinks || []).map(l => FMT[String(l?.title || '').toLowerCase()]).filter(Boolean);
  const res = Number(d.text1Resolution);
  return {
    source: 'sharetextures', sourceId: `${type}/${d.slug}`, title: String(d.title).trim(), creator, creatorUrl: 'https://www.sharetextures.com/',
    license: 'CC0', url,
    thumbnail: img(p.thumbObjectKey) || img(p.originalObjectKey), image: img(p.originalObjectKey) || img(p.thumbObjectKey),
    kind: t[0], style: 'realistic', formats: [...t[1], ...formats],
    textureRes: Number.isFinite(res) && res > 0 ? res : null,
    tags: [d.categoryName, d.itemTypeName, ...(d.tagNames || [])].filter(x => x && !/share ?textures/i.test(x)),
  };
}

export async function crawlShareTextures({ get, sleep, limit = Infinity, delay = 1200 }) {
  const urls = parseSitemap(await get(SITEMAP)).slice(0, limit);
  const out = [];
  for (const [i, url] of urls.entries()) {
    try { const m = mapShareTextures(extractDetail(await get(url)), url); if (m) out.push(m); }
    catch (e) { console.warn('sharetextures', url, e.message); }
    if (i % 100 === 0) console.log('sharetextures', i, out.length);
    await sleep(delay);
  }
  return out;
}
