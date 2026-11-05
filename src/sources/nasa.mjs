// NASA Image and Video Library (images-api.nasa.gov), images only. US-government works -> 'Public Domain'.
// Items whose credit names a third party (ESA, STScI, universities, companies, press agencies, copyright) are skipped.
const THIRD = /©|\(c\)|copyright|courtesy|getty|reuters|associated press|\bAP\b|\bAFP\b|\bESA\b|\bCSA\b|JAXA|Roscosmos|STScI|AURA|Harvard|Smithsonian|Universit|Univ\.|Institut|\bInc\b|LLC|Corp|SpaceX|Boeing|Lockheed|Northrop|Blue Origin|Ball Aerospace|Max Planck|\bDLR\b|CNES|\bESO\b|NOAA|USGS|Sierra|Axiom|Airbus|Planet Labs|Maxar/i;
export function mapNasa(entry) {
  const d = entry.data?.[0];
  if (!d || d.media_type !== 'image' || !d.nasa_id) return null;
  const credit = [d.photographer, d.secondary_creator].filter(Boolean).join(' ');
  if (THIRD.test(credit) || /©|copyright|getty|reuters|associated press|courtesy of (?!nasa)/i.test(d.description || '')) return null;
  const links = entry.links || [];
  const by = r => links.find(l => new RegExp(`~${r}\\.`).test(l.href))?.href;
  const id = d.nasa_id;
  const enc = encodeURIComponent(id);
  const orig = links.find(l => l.rel === 'canonical');
  return {
    source: 'nasa', sourceId: id, title: d.title || id,
    creator: d.photographer && !/nasa/i.test(d.photographer) ? `NASA/${d.photographer}` : (d.center ? `NASA ${d.center}` : 'NASA'),
    creatorUrl: 'https://images.nasa.gov/', license: 'Public Domain', url: `https://images.nasa.gov/details/${enc}`,
    thumbnail: by('thumb') || by('small') || null, image: by('medium') || by('large') || null, kind: '2d', style: 'realistic',
    formats: ['JPG'], tags: ['nasa', 'space', ...(d.keywords || []).slice(0, 8).map(k => String(k).toLowerCase())],
    downloadUrl: orig?.href || `https://images-assets.nasa.gov/image/${enc}/${enc}~orig.jpg`, fileSize: orig?.size ?? null,
    textureRes: orig?.width ? Math.max(orig.width, orig.height || 0) : null,
  };
}
export const NASA_QUERIES = ['nebula', 'galaxy', 'earth from space', 'mars surface', 'moon surface', 'apollo', 'space shuttle', 'international space station', 'rocket launch', 'astronaut', 'spacewalk', 'saturn', 'jupiter', 'sun solar', 'aurora', 'hurricane', 'planet', 'comet', 'asteroid', 'rover', 'aircraft', 'wind tunnel', 'telescope', 'satellite', 'mission control'];
export async function crawlNasa({ sleep, fetchImpl = fetch, log = console.log, queries = NASA_QUERIES, pages = 10 }) {
  const out = new Map(); let skipped = 0;
  for (const q of queries) for (let page = 1; page <= pages; page++) {
    await sleep(1000);
    const r = await fetchImpl(`https://images-api.nasa.gov/search?media_type=image&page_size=100&page=${page}&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)' } });
    if (!r.ok) { log(`nasa ${q} p${page}: HTTP ${r.status}`); break; }
    const items = (await r.json()).collection?.items || [];
    for (const e of items) { const it = mapNasa(e); if (it) out.set(it.sourceId, it); else skipped++; }
    log(`nasa ${q} p${page}: ${out.size} (skipped ${skipped})`);
    if (items.length < 100) break;
  }
  return [...out.values()];
}
