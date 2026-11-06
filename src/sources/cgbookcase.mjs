// cgbookcase.com — free CC0 PBR textures (link-only; never rehost).
// Asset list from the public /api/textures JSON (robots.txt has no Disallow; search indexing is allowed).
// Site states textures are published under CC0 1.0; each texture page also emits meta tex1:license=cc0.
const API = 'https://www.cgbookcase.com/api/textures';
const SITE = 'https://www.cgbookcase.com/';
const CREATOR = 'cgbookcase';

/** Page path slug: spaces → hyphens, lowercased (matches site JS). */
export function pageSlug(title) {
  return String(title || '').replace(/ /g, '-').toLowerCase();
}

/**
 * Legacy render CDN slug for id ≤ 538 (matches site JS transforms).
 * Newer assets (id > 538) use a different CDN path and do not need this.
 */
export function legacyRenderSlug(title) {
  const o = String(title || '').replace(/ /g, '_').toLowerCase();
  let s = (o.charAt(0).toUpperCase() + o.slice(1));
  for (const [a, b] of [
    ['Small', 'small'], ['Large', 'large'], ['Medium', 'medium'], ['3d', '3D'],
    ['lack_ti', 'lack_Ti'], ['shed_metal_ti', 'shed_Metal_Ti'], ['ark_ocean_ti', 'ark_Ocean_Ti'],
    ['hite_ti', 'hite_Ti'], ['Snow_white_Tiles', 'Snow_white_tiles'],
    ['small_', 'Small_'], ['large_', 'Large_'], ['Natural_stone', 'Natural_Stone'],
  ]) s = s.replace(a, b);
  return s;
}

/** Compact title with spaces removed (new render CDN + thumbnail folders). */
export function compactTitle(title) {
  return String(title || '').replaceAll(' ', '');
}

export function previewUrls(row) {
  const id = Number(row?.id);
  const title = row?.title;
  if (!title || !Number.isFinite(id)) return { thumbnail: null, image: null };
  if (id > 538) {
    const base = `https://cgbookcase.b-cdn.net/textures/renders/2024_b/${compactTitle(title)}_render_default.jpg`;
    return { thumbnail: `${base}?width=480`, image: `${base}?width=720` };
  }
  const slug = legacyRenderSlug(title);
  const image = `https://cdn.cgbookcase.cloud/file/cgbookcase/textures/renders/bg_white/480w/${slug}_default.jpg`;
  return { thumbnail: image, image };
}

const MAP_FMT = {
  AO: 'PNG', Base_Color: 'PNG', Height: 'PNG', Normal: 'PNG', Roughness: 'PNG',
  Metallic: 'PNG', Opacity: 'PNG', Emission: 'PNG', Displacement: 'PNG',
};

export function mapCgBookcase(row) {
  if (!row || typeof row !== 'object') return null;
  const title = String(row.title || '').trim();
  const id = Number(row.id);
  if (!title || !Number.isFinite(id) || id <= 0) return null;
  const { thumbnail, image } = previewUrls(row);
  if (!thumbnail && !image) return null;
  const resK = Number(row.resolution);
  let formats = [...new Set((row.files || []).map(f => MAP_FMT[f]).filter(Boolean))];
  if (!formats.length) formats.push('PNG');
  const tags = [
    ...(row.categories || []),
    ...(row.tags || []),
    ...(row.colors || []),
    row.oneType,
    'pbr',
    'texture',
  ].filter(t => t && typeof t === 'string' && !/^\d+$/.test(t));
  return {
    source: 'cgbookcase',
    sourceId: String(id),
    title,
    creator: CREATOR,
    creatorUrl: SITE,
    license: 'CC0',
    url: `${SITE}textures/${pageSlug(title)}`,
    thumbnail: thumbnail || image,
    image: image || thumbnail,
    kind: 'texture',
    style: 'realistic',
    formats,
    textureRes: Number.isFinite(resK) && resK > 0 ? resK * 1024 : null,
    tags: [...new Set(tags)].slice(0, 24),
  };
}

export async function crawlCgBookcase({ get, sleep, limit = Infinity } = {}) {
  void sleep;
  const raw = await get(API, true);
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const row of list) {
    if (out.length >= limit) break;
    const m = mapCgBookcase(row);
    if (!m || seen.has(m.sourceId)) continue;
    seen.add(m.sourceId);
    out.push(m);
  }
  return out;
}
