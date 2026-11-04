// ambientCG (https://ambientcg.com) — all assets CC0. Official API: /api/v2/full_json
const KIND = { Material: ['texture', ['PNG', 'JPG']], Decal: ['texture', ['PNG']], Atlas: ['texture', ['PNG']], HDRI: ['hdri', ['HDR', 'EXR']], '3DModel': ['3d', ['OBJ', 'FBX']] };
const pick = (p, keys) => keys.map(k => p[k]).find(Boolean) || null;
export function mapAmbientCG(a) {
  const k = KIND[a.dataType]; if (!k) return null;
  let p = a.previewImage || {}; if (typeof p === 'string') { try { p = JSON.parse(p.replace(/'/g, '"')); } catch { p = {}; } }
  return {
    source: 'ambientcg', sourceId: a.assetId, title: a.displayName || a.assetId, creator: 'ambientCG', creatorUrl: 'https://ambientcg.com/',
    license: 'CC0', url: a.shortLink || `https://ambientcg.com/a/${a.assetId}`,
    thumbnail: pick(p, ['256-PNG', '256-JPG-FFFFFF', '128-PNG']), image: pick(p, ['1024-JPG-FFFFFF', '1024-PNG', '512-PNG', '512-JPG-FFFFFF']),
    kind: k[0], style: 'realistic', formats: k[1],
    tags: [a.displayCategory, ...(a.tags || [])].filter(t => t && !/^\d+$/.test(t) && t.toLowerCase() !== String(a.assetId).toLowerCase()),
  };
}
export async function crawlAmbientCG({ get, sleep }) {
  const out = []; let url = 'https://ambientcg.com/api/v2/full_json?limit=250&offset=0&include=displayData,tagData,imageData';
  for (let offset = 0; ; offset += 250) {
    const d = await get(`https://ambientcg.com/api/v2/full_json?limit=250&offset=${offset}&include=displayData,tagData,imageData`, true);
    for (const a of d.foundAssets || []) { const m = mapAmbientCG(a); if (m) out.push(m); }
    if (!d.foundAssets?.length || offset + 250 >= d.numberOfResults) break;
    await sleep(1500);
  }
  return out;
}
