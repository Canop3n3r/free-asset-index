// Wikimedia Commons, CC0 files only, via the official MediaWiki API (api.php search + imageinfo).
// Serial requests, 1 req/s, maxlag=5, descriptive User-Agent (per Wikimedia API etiquette). Link-only.
const strip = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
export const WM_QUERIES = [
  ['seamless texture', 'texture'], ['tileable texture', 'texture'], ['texture material', 'texture'],
  ['pixel art', '2d'], ['sprite sheet', '2d'], ['game icon', '2d'], ['tileset', '2d'],
  ['equirectangular panorama', 'hdri'], ['sky panorama 360', 'hdri'],
  ['sound effect', 'audio', 'filetype:audio'], ['ambience', 'audio', 'filetype:audio'], ['music loop', 'audio', 'filetype:audio'],
  ['seamless pattern', 'texture'], ['stone texture', 'texture'], ['wood texture', 'texture'], ['metal texture', 'texture'], ['fabric texture', 'texture'], ['brick wall texture', 'texture'],
  ['game sprite', '2d'], ['icon set', '2d'], ['clip art', '2d'], ['360 panorama', 'hdri'],
  ['field recording', 'audio', 'filetype:audio'], ['nature sounds', 'audio', 'filetype:audio'],
];
export function mapWikimedia(p, kind = '2d') {
  const ii = p.imageinfo?.[0]; const md = ii?.extmetadata || {};
  const lic = strip(md.LicenseShortName?.value);
  if (!ii || !/^CC0\b/i.test(lic)) return null;
  const name = p.title.replace(/^File:/, '');
  const ext = (name.split('.').pop() || '').toUpperCase();
  const audio = /^audio\//.test(ii.mime || '') || ['OGG', 'OGA', 'WAV', 'FLAC', 'MP3', 'OPUS'].includes(ext);
  const thumb = audio ? null : (ii.thumburl || '').split('?')[0] || null;
  const creator = strip(md.Artist?.value).slice(0, 120) || 'Wikimedia Commons contributor';
  return {
    source: 'wikimedia', sourceId: String(p.pageid), title: strip(md.ObjectName?.value) || name.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
    creator, creatorUrl: null, license: 'CC0', url: `https://commons.wikimedia.org/w/index.php?curid=${p.pageid}`, // file-page link (title URLs end in .png/.jpg)
    thumbnail: thumb, kind: audio ? 'audio' : kind, style: null,
    formats: [ext === 'JPEG' ? 'JPG' : ext], tags: ['wikimedia', ...strip(md.Categories?.value).split('|').filter(Boolean).slice(0, 12)],
    fileSize: Number.isFinite(ii.size) ? ii.size : null, textureRes: audio ? null : (Math.max(ii.width || 0, ii.height || 0) || null),
    downloadUrl: (ii.url || '').split('?')[0] || null,
  };
}
export async function crawlWikimedia({ sleep, fetchImpl = fetch, log = console.log, pages = Number(process.env.WM_PAGES || 6) }) {
  const out = new Map();
  for (const [q, kind, ft = 'filetype:bitmap'] of WM_QUERIES) {
    let offset = 0;
    for (let page = 0; page < pages && offset !== null; page++) {
      await sleep(1000);
      const u = new URL('https://commons.wikimedia.org/w/api.php');
      Object.entries({ action: 'query', format: 'json', formatversion: '1', maxlag: '5', generator: 'search', gsrnamespace: '6', gsrlimit: '50', gsroffset: String(offset),
        gsrsearch: `${q} incategory:CC-Zero ${ft}`, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '400',
        iiextmetadatafilter: 'LicenseShortName|Artist|ObjectName|Categories' }).forEach(([k, v]) => u.searchParams.set(k, v));
      const r = await fetchImpl(u, { headers: { 'User-Agent': 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)' } });
      if (!r.ok) { log(`wikimedia "${q}": HTTP ${r.status}`); break; }
      const d = await r.json();
      if (d.error?.code === 'maxlag') { await sleep(5000); page--; continue; }
      for (const p of Object.values(d.query?.pages || {})) { const it = mapWikimedia(p, kind); if (it) out.set(it.sourceId, it); }
      offset = d.continue?.gsroffset ?? null;
    }
    log(`wikimedia "${q}": ${out.size}`);
  }
  return [...out.values()];
}
