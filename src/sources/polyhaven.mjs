// Poly Haven official API (api.polyhaven.com). All assets CC0. Download URLs come from /files/{id}.
const FMT = { 0: ['HDR', 'EXR'], 1: ['PNG', 'JPG', 'EXR'], 2: ['GLTF', 'FBX', 'BLEND'] };
const KIND = { 0: 'hdri', 1: 'texture', 2: '3d' };
const MAPKEY = { Diffuse: 'color', nor_gl: 'normal', Rough: 'roughness', Displacement: 'displacement', AO: 'ambient-occlusion', Metal: 'metalness' };
const sum = o => Object.values(o || {}).reduce((s, f) => s + (f.size || 0), 0);
export function mapPolyHaven(id, a, files = null) {
  const r = {
    source: 'polyhaven', sourceId: id, title: a.name, creator: Object.keys(a.authors || {}).join(', ') || 'Poly Haven', creatorUrl: null,
    license: 'CC0', url: `https://polyhaven.com/a/${id}`, thumbnail: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256`,
    kind: KIND[a.type], style: 'realistic', formats: FMT[a.type], tags: [...(a.categories || []), ...(a.tags || [])],
    triangles: Number.isFinite(a.polycount) ? a.polycount : null, textureRes: Array.isArray(a.max_resolution) ? Math.max(...a.max_resolution) : null,
    downloadUrl: null, fileSize: null, downloads: [],
  };
  if (!files) return r;
  if (a.type === 0) { const f = files.hdri?.['1k']?.hdr; if (f) { r.downloadUrl = f.url; r.fileSize = f.size; r.downloads = ['1k', '2k'].map(k => files.hdri?.[k]?.hdr && { label: `HDR ${k}`, url: files.hdri[k].hdr.url, size: files.hdri[k].hdr.size }).filter(Boolean); } }
  if (a.type === 2) { const g = files.gltf?.['1k']?.gltf; if (g) { r.downloadUrl = g.url; r.fileSize = g.size + sum(g.include); r.downloads = [{ label: 'glTF 1k (+ .bin and textures listed in it)', url: g.url, size: r.fileSize }]; const f = files.fbx?.['1k']?.fbx; if (f) r.downloads.push({ label: 'FBX 1k', url: f.url, size: f.size }); } }
  if (a.type === 1) {
    r.maps = Object.keys(MAPKEY).filter(k => files[k]).map(k => MAPKEY[k]);
    r.downloads = Object.keys(MAPKEY).filter(k => files[k]?.['1k']?.jpg || files[k]?.['1k']?.png).map(k => { const f = files[k]['1k'].jpg || files[k]['1k'].png; return { label: `${MAPKEY[k]} 1k`, url: f.url, size: f.size }; });
    if (r.downloads[0]) { r.downloadUrl = r.downloads[0].url; r.fileSize = r.downloads.reduce((s, d) => s + d.size, 0); }
  }
  return r;
}
export async function crawlPolyHaven({ get, sleep, log = console.log }) {
  const all = await get('https://api.polyhaven.com/assets', true);
  const out = []; let n = 0;
  for (const [id, a] of Object.entries(all)) {
    let files = null;
    try { await sleep(250); files = await get(`https://api.polyhaven.com/files/${encodeURIComponent(id)}`, true); } catch (e) { log(`files ${id}: ${e.message}`); }
    out.push(mapPolyHaven(id, a, files));
    if (++n % 200 === 0) log(`polyhaven ${n}`);
  }
  return out;
}
