// Quaternius pack pages: formats come from the "tags" divs (FBX/OBJ/glTF/Blend), falling back to the meta description.
const ORDER = ['GLB', 'GLTF', 'FBX', 'OBJ', 'BLEND'];
export function parseQuaterniusFormats(html) {
  const divs = [...html.matchAll(/class="text-right tags">\s*([^<]+?)\s*</g)].map(m => m[1].toUpperCase()).filter(f => ORDER.includes(f));
  if (divs.length) return [...new Set(divs)];
  const meta = (html.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  return ORDER.filter(f => new RegExp(`\\.?\\b${f}\\b`, 'i').test(meta)).sort((a, b) => ['FBX', 'OBJ', 'GLTF', 'GLB', 'BLEND'].indexOf(a) - ['FBX', 'OBJ', 'GLTF', 'GLB', 'BLEND'].indexOf(b));
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();
export async function crawlQuaternius({ get, sleep }) {
  const home = await get('https://quaternius.com/index.html');
  const out = [];
  for (const b of home.split('class="hvr-sink"').slice(1)) {
    const href = b.match(/href="\/packs\/([a-z0-9]+)\.html"/); if (!href) continue;
    const title = decode((b.match(/class="PackText">([^<]*)/) || [])[1] || href[1]);
    const tags = [...b.matchAll(/class="viewtag tags">([^<]*)/g)].map(m => decode(m[1]));
    const thumb = (b.match(/src="(\/assets\/images\/thumbnails\/[^"]+)"/) || [])[1];
    let formats = [];
    try { await sleep(1000); formats = parseQuaterniusFormats(await get(`https://quaternius.com/packs/${href[1]}.html`)); } catch (e) { console.warn(e.message); }
    out.push({ source: 'quaternius', sourceId: href[1], title, creator: 'Quaternius', creatorUrl: 'https://quaternius.com/', license: 'CC0',
      url: `https://quaternius.com/packs/${href[1]}.html`, thumbnail: thumb ? `https://quaternius.com${thumb}` : null, kind: '3d', style: 'low-poly', formats, tags });
  }
  return out;
}
