// Sketchfab public Data API v3 search: downloadable models with CC0 or CC-BY only. The token is sent in the
// Authorization header and is never stored. Downloads require the user's own Sketchfab login (OAuth), so downloadUrl is null.
// Quick-view may use Sketchfab's official embed player (embedUrl).
export function sketchfabLicense(l) {
  const s = `${l?.slug || ''} ${l?.label || ''}`.toLowerCase();
  if (/\bcc0\b|public domain/.test(s)) return 'CC0';
  if (/(^|\s)by(\s|$)|cc attribution$|^cc attribution\b/.test(s.trim()) && !/nc|nd|sa|non|share|deriv/.test(s)) return 'CC-BY 4.0';
  return null;
}
const largest = imgs => [...(imgs || [])].sort((a, b) => (b.width || 0) - (a.width || 0));
export function mapSketchfab(m) {
  const license = sketchfabLicense(m.license); if (!license || !m.isDownloadable) return null;
  const imgs = largest(m.thumbnails?.images);
  const thumb = [...imgs].reverse().find(i => (i.width || 0) >= 256) || imgs[imgs.length - 1];
  const fmts = Object.keys(m.archives || {}).map(k => ({ gltf: 'GLTF', glb: 'GLB', usdz: 'USDZ', source: null }[k])).filter(Boolean);
  const sizes = Object.values(m.archives || {}).map(a => a?.size).filter(Number.isFinite);
  return {
    source: 'sketchfab', sourceId: m.uid, title: m.name, creator: m.user?.displayName || m.user?.username, creatorUrl: m.user?.profileUrl || null,
    license, url: m.viewerUrl || `https://sketchfab.com/3d-models/${m.uid}`, thumbnail: thumb?.url || null, image: imgs[0]?.url || null,
    kind: '3d', style: null, formats: fmts.length ? fmts : ['GLTF'],
    tags: [...(m.categories || []).map(c => c.name), ...(m.tags || []).map(t => t.name || t)],
    triangles: Number.isFinite(m.faceCount) ? m.faceCount : null, vertices: Number.isFinite(m.vertexCount) ? m.vertexCount : null,
    fileSize: sizes.length ? Math.min(...sizes) : null, downloadUrl: null,
    embedUrl: /^https:\/\/sketchfab\.com\/models\/[0-9a-f]+\/embed$/.test(m.embedUrl || '') ? m.embedUrl : null,
  };
}
export const SK_QUERIES = ['', 'low poly', 'vehicle', 'spaceship', 'rocket', 'tree', 'rock', 'building', 'character', 'prop', 'weapon', 'furniture', 'game asset'];
export async function crawlSketchfab({ sleep, key, fetchImpl = fetch, log = console.log, pagesTop = Number(process.env.SK_TOP_PAGES || 25), pagesQuery = Number(process.env.SK_QUERY_PAGES || 5) }) {
  const out = new Map();
  for (const lic of ['cc0', 'by']) for (const q of SK_QUERIES) {
    let url = `https://api.sketchfab.com/v3/search?type=models&downloadable=true&license=${lic}&count=24&sort_by=-likeCount${q ? `&q=${encodeURIComponent(q)}` : ''}`;
    for (let page = 0; url && page < (q ? pagesQuery : pagesTop); page++) {
      await sleep(1100);
      const r = await fetchImpl(url, { headers: { Authorization: `Token ${key}`, 'User-Agent': 'free-asset-index/0.1' } });
      if (r.status === 429) { log('sketchfab rate limited; waiting 60s'); await sleep(60000); page--; continue; }
      if (!r.ok) { log(`sketchfab ${lic} "${q}": HTTP ${r.status}`); break; }
      const d = await r.json();
      for (const m of d.results || []) { const it = mapSketchfab(m); if (it) out.set(it.sourceId, it); }
      url = d.next && d.next.startsWith('https://api.sketchfab.com/') ? d.next : null;
    }
    log(`sketchfab ${lic} "${q}": ${out.size}`);
  }
  return [...out.values()];
}
