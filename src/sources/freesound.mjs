// Freesound (https://freesound.org) via its official APIv2. Only CC0 and CC-BY: NC and Sampling+ are excluded.
// The API key is sent in an Authorization header (never in URLs) and is never stored. Original-file download needs OAuth,
// so downloadUrl is the official HQ MP3 preview from cdn.freesound.org.
export function freesoundLicense(url) {
  const u = String(url || '').toLowerCase();
  if (/publicdomain\/zero\/1\.0/.test(u)) return 'CC0';
  if (/licenses\/by\/4\.0/.test(u)) return 'CC-BY 4.0';
  if (/licenses\/by\/3\.0/.test(u)) return 'CC-BY 3.0';
  return null; // by-nc, sampling+, anything else
}
export const QUERIES = [
  ['footsteps', 'sfx'], ['explosion', 'sfx'], ['laser', 'sfx'], ['gunshot', 'sfx'], ['impact', 'sfx'], ['ui click', 'sfx'], ['button', 'sfx'], ['coin', 'sfx'],
  ['jump', 'sfx'], ['door', 'sfx'], ['engine', 'sfx'], ['rocket', 'sfx'], ['rocket launch', 'sfx'], ['thruster', 'sfx'], ['sci-fi', 'sfx'], ['whoosh', 'sfx'], ['power up', 'sfx'],
  ['hit', 'sfx'], ['alarm', 'sfx'], ['beep', 'sfx'], ['countdown', 'sfx'],
  ['wind ambience', 'ambience'], ['rain', 'ambience'], ['ocean waves', 'ambience'], ['forest ambience', 'ambience'], ['city ambience', 'ambience'], ['space ambience', 'ambience'], ['room tone', 'ambience'],
  ['music loop', 'music'], ['chiptune', 'music'], ['game music', 'music'], ['ambient music', 'music'],
];
export function mapFreesound(s, hint) {
  const license = freesoundLicense(s.license); if (!license) return null;
  const prev = s.previews?.['preview-hq-mp3'] || s.previews?.['preview-lq-mp3'] || null;
  return {
    source: 'freesound', sourceId: String(s.id), title: s.name, creator: s.username, creatorUrl: `https://freesound.org/people/${encodeURIComponent(s.username)}/`,
    license, url: s.url || `https://freesound.org/s/${s.id}/`, thumbnail: s.images?.waveform_m || null, image: s.images?.waveform_l || null,
    kind: 'audio', style: null, formats: [String(s.type || '').toUpperCase(), 'MP3'].filter(Boolean),
    tags: [hint === 'music' ? 'music' : hint === 'ambience' ? 'ambience' : 'sfx', ...(s.tags || [])],
    downloadUrl: prev, preview: prev, fileSize: null, duration: s.duration ?? null,
  };
}
export async function crawlFreesound({ sleep, key, fetchImpl = fetch, log = console.log, pages = 1 }) {
  const out = new Map();
  const fields = 'id,name,username,license,previews,tags,duration,url,images,type';
  for (const [q, hint] of QUERIES) for (let page = 1; page <= pages; page++) {
    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(q)}&filter=${encodeURIComponent('license:("Creative Commons 0" OR "Attribution")')}&sort=downloads_desc&page_size=150&page=${page}&fields=${fields}`;
    await sleep(1200); // API limit is 60 requests/minute
    const r = await fetchImpl(url, { headers: { Authorization: `Token ${key}`, 'User-Agent': 'free-asset-index/0.1' } });
    if (!r.ok) { log(`freesound ${q}: HTTP ${r.status}`); break; }
    const d = await r.json();
    for (const s of d.results || []) { const m = mapFreesound(s, hint); if (m && !out.has(m.sourceId)) out.set(m.sourceId, m); }
    log(`freesound ${q} p${page}: ${out.size}`);
    if (!d.next) break;
  }
  return [...out.values()];
}
