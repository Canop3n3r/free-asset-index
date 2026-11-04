// Shared core: license table, item normalization, attribution, search. Runs in Node and the browser.
export const LICENSES = {
  'CC0': { name: 'CC0 1.0 (Public Domain)', url: 'https://creativecommons.org/publicdomain/zero/1.0/', requiresAttribution: false },
  'CC-BY 3.0': { name: 'Creative Commons Attribution 3.0', url: 'https://creativecommons.org/licenses/by/3.0/', requiresAttribution: true },
  'CC-BY 4.0': { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', requiresAttribution: true },
};
export const FORMATS = ['GLB', 'GLTF', 'FBX', 'OBJ', 'BLEND', 'PNG', 'JPG', 'EXR', 'HDR'];

export function slugify(s) {
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function attribution(i) {
  return `"${i.title}" by ${i.creator} (${i.url}), licensed under ${i.license} (${LICENSES[i.license].url}).`;
}

export function normalizeItem(raw) {
  const license = raw.license;
  if (!LICENSES[license]) throw new Error(`license not allowed: ${license}`);
  for (const k of ['source', 'sourceId', 'title', 'creator', 'url']) if (!raw[k]) throw new Error(`missing ${k}`);
  if (!/^https:\/\//.test(raw.url)) throw new Error('url must be https');
  const item = {
    id: `${raw.source}:${raw.sourceId}`,
    source: raw.source,
    title: String(raw.title).trim(),
    creator: String(raw.creator).trim(),
    creatorSlug: slugify(raw.creator),
    creatorUrl: raw.creatorUrl || null,
    license, licenseUrl: LICENSES[license].url,
    url: raw.url,
    thumbnail: /^https:\/\//.test(raw.thumbnail || '') ? raw.thumbnail : null,
    image: /^https:\/\//.test(raw.image || '') ? raw.image : null,
    kind: raw.kind || null,
    style: raw.style || null,
    formats: [...new Set((raw.formats || []).map(f => String(f).toUpperCase()))],
    tags: [...new Set((raw.tags || []).map(t => String(t).toLowerCase()))].slice(0, 20),
  };
  if (Array.isArray(raw.maps) && raw.maps.length) item.maps = raw.maps.map(String);
  // Optional budget / download metadata (only where a source's API officially provides it).
  const num = v => (Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
  const https = u => (typeof u === 'string' && /^https:\/\//.test(u) && !/[?&](token|api_key|key)=/i.test(u) ? u : null);
  item.downloadUrl = https(raw.downloadUrl);
  item.fileSize = num(raw.fileSize); item.triangles = num(raw.triangles); item.textureRes = num(raw.textureRes);
  if (Number.isFinite(raw.vertices)) item.vertices = Math.round(raw.vertices);
  if (typeof raw.embedUrl === 'string' && /^https:\/\/sketchfab\.com\/models\/[0-9a-f]+\/embed$/.test(raw.embedUrl)) item.embedUrl = raw.embedUrl;
  const pv = https(raw.preview); if (pv) item.preview = pv;
  if (Number.isFinite(raw.duration)) item.duration = Math.round(raw.duration * 10) / 10;
  const dls = (Array.isArray(raw.downloads) ? raw.downloads : []).filter(d => d && https(d.url)).map(d => ({ label: String(d.label), url: d.url, size: num(d.size) }));
  if (dls.length) item.downloads = dls;
  item.attribution = attribution(item);
  return item;
}

export function search(items, p = {}) {
  const q = (p.q || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const fmt = p.format ? String(p.format).toUpperCase() : null;
  const fmts = fmt === 'GLB' ? ['GLB', 'GLTF'] : [fmt];
  const lic = p.license ? String(p.license).toUpperCase() : null;
  const out = items.filter(i =>
    (!fmt || fmts.some(f => i.formats.includes(f))) &&
    (!lic || i.license.toUpperCase().startsWith(lic)) &&
    (!p.style || i.style === p.style || (i.styles || []).includes(p.style)) &&
    (!p.category || (i.categories || []).includes(p.category)) &&
    (!p.kind || i.kind === p.kind) &&
    (!p.source || i.source === p.source) &&
    (!p.creator || i.creatorSlug === p.creator) &&
    q.every(w => (i.title + ' ' + i.creator + ' ' + i.tags.join(' ')).toLowerCase().includes(w)));
  if (p.maxTriangles) { const m = Number(p.maxTriangles); for (let n = out.length - 1; n >= 0; n--) if (!(out[n].triangles != null && out[n].triangles <= m)) out.splice(n, 1); }
  if (p.maxFileSize) { const m = Number(p.maxFileSize) * 1048576; for (let n = out.length - 1; n >= 0; n--) if (!(out[n].fileSize != null && out[n].fileSize <= m)) out.splice(n, 1); }
  if (p.maxTextureRes) { const m = Number(p.maxTextureRes); for (let n = out.length - 1; n >= 0; n--) if (!(out[n].textureRes != null && out[n].textureRes <= m)) out.splice(n, 1); }
  if (p.audio) { for (let n = out.length - 1; n >= 0; n--) if (out[n].audio !== p.audio) out.splice(n, 1); }
  if (p.map) { for (let n = out.length - 1; n >= 0; n--) if (!(out[n].maps || []).includes(p.map)) out.splice(n, 1); }
  if (p.sort === 'quality') out.sort((a, b) => (b.quality || 0) - (a.quality || 0));
  else if (p.sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title));
  const limit = Math.min(Math.max(parseInt(p.limit) || 50, 1), 200);
  const offset = Math.max(parseInt(p.offset) || 0, 0);
  return { total: out.length, offset, limit, results: out.slice(offset, offset + limit) };
}

export function creatorStats(items) {
  const m = new Map();
  for (const i of items) {
    const c = m.get(i.creatorSlug) || { slug: i.creatorSlug, name: i.creator, url: i.creatorUrl, sources: new Set(), count: 0 };
    c.count++; c.sources.add(i.source); m.set(i.creatorSlug, c);
  }
  return [...m.values()].map(c => ({ ...c, sources: [...c.sources] })).sort((a, b) => b.count - a.count);
}
