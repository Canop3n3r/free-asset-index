// Smithsonian Open Access (api.si.edu) 3D packages, CC0 only. The api.data.gov key is sent as an X-Api-Key header, never in URLs.
const num = s => { const m = /(\d+)k\b/i.exec(s || ''); return m ? Number(m[1]) * 1000 : null; };
export function mapSmithsonian(row) {
  const d = row.content?.descriptiveNonRepeating || {};
  const out = [];
  for (const m of d.online_media?.media || []) {
    if (m.type !== '3d_voyager' || m.usage?.access !== 'CC0') continue;
    const res = m.resources || [];
    const glbs = res.filter(r => /\.glb$/i.test(r.url));
    const glb = glbs.find(r => /low/i.test(r.category || '') && !/draco/i.test(r.url)) || glbs.find(r => !/draco/i.test(r.url)) || glbs[0];
    const size = r => (r?.attributes || []).map(a => a.FILE_SIZE).find(Boolean) ?? null;
    const fname = glb?.filename || glb?.url || '';
    const tex = /-(\d{3,5})(?:[_.-]|$)/.exec(fname.replace(/-\d+k-/, '-')); 
    const types = new Set(res.map(r => (r.attributes || []).map(a => a.MODEL_FILE_TYPE).find(Boolean)).filter(Boolean).map(t => t.toUpperCase()));
    out.push({
      source: 'smithsonian', sourceId: m.id.replace(/^3d_package:/, ''), title: row.title, creator: d.data_source || 'Smithsonian Institution',
      creatorUrl: 'https://3d.si.edu/', license: 'CC0', url: m.content || `https://3d-api.si.edu/voyager/${m.id}`,
      thumbnail: m.thumbnail || null, kind: '3d', style: 'realistic',
      formats: [...types].map(t => (t === 'GLTF' ? 'GLTF' : t)).filter(t => ['GLB', 'GLTF', 'OBJ', 'FBX', 'USDZ'].includes(t)).concat(glbs.length ? ['GLB'] : []),
      tags: ['smithsonian', ...(row.content?.indexedStructured?.topic || []), ...(row.content?.indexedStructured?.object_type || [])],
      downloadUrl: glb?.url || null, fileSize: size(glb), triangles: num(fname), textureRes: tex ? Number(tex[1]) : null,
      downloads: res.filter(r => /\.(glb|zip|usdz)$/i.test(r.url)).slice(0, 6).map(r => ({ label: r.title || r.filename, url: r.url, size: size(r) })),
    });
  }
  return out;
}
export async function crawlSmithsonian({ sleep, key, fetchImpl = fetch, log = console.log }) {
  const out = new Map();
  for (let start = 0; ; start += 100) {
    await sleep(1000);
    const r = await fetchImpl(`https://api.si.edu/openaccess/api/v1.0/search?q=${encodeURIComponent('online_media_type:3D*')}&rows=100&start=${start}`, { headers: { 'X-Api-Key': key, 'User-Agent': 'free-asset-index/0.1' } });
    if (!r.ok) { log(`smithsonian start=${start}: HTTP ${r.status}`); break; }
    const resp = (await r.json()).response || {};
    for (const row of resp.rows || []) for (const it of mapSmithsonian(row)) out.set(it.sourceId, it);
    log(`smithsonian ${start}: ${out.size}`);
    if (!resp.rows?.length || start + 100 >= resp.rowCount) break;
  }
  return [...out.values()];
}
