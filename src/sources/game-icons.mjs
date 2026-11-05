// game-icons.net SVG icons via GitHub game-icons/icons (link-only; do not rehost).
// License: Creative Commons 3.0 BY, or CC0 for artists marked CC0 in license.txt.
const UA = 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)';
const TREE_URL = 'https://api.github.com/repos/game-icons/icons/git/trees/master?recursive=1';

/** Artists listed as CC0 in license.txt (folder slug → true). Everyone else: CC-BY 3.0. */
export const CC0_ARTISTS = new Set(['viscious-speed', 'zeromancer']);

/** Preferred display names from license.txt (folder slug → name). */
export const ARTIST_NAMES = {
  andymeneely: 'Andy Meneely',
  aussiesim: 'Aussiesim',
  badges: 'Badges',
  'carl-olsen': 'Carl Olsen',
  'caro-asercion': 'Caro Asercion',
  cathelineau: 'Cathelineau',
  catsu: 'Catsu',
  darkzaitzev: 'DarkZaitzev',
  delapouite: 'Delapouite',
  faithtoken: 'Faithtoken',
  felbrigg: 'Felbrigg',
  generalace135: 'GeneralAce135',
  guard13007: 'Guard13007',
  'heavenly-dog': 'Heavenly Dog',
  irongamer: 'Irongamer',
  'john-colburn': 'John Colburn',
  'john-redman': 'John Redman',
  'kier-heyl': 'Kier Heyl',
  lorc: 'Lorc',
  'lord-berandas': 'Lord Berandas',
  lucasms: 'Lucas',
  'pepijn-poolman': 'Pepijn Poolman',
  'pierre-leducq': 'Pierre Leducq',
  priorblue: 'PriorBlue',
  quoting: 'Quoting',
  rihlsul: 'Rihlsul',
  sbed: 'Sbed',
  seregacthtuf: 'SeregaCthtuf',
  skoll: 'Skoll',
  sparker: 'Sparker',
  spencerdub: 'SpencerDub',
  starseeker: 'Starseeker',
  'various-artists': 'Various Artists',
  'viscious-speed': 'Viscious Speed',
  willdabeast: 'Willdabeast',
  zajkonur: 'Zajkonur',
  zeromancer: 'Zeromancer',
};

/** Optional creator URLs from license.txt (prefer https; omit dead http-only blogs → site root). */
export const ARTIST_URLS = {
  andymeneely: 'https://www.se.rit.edu/~andy/',
  'carl-olsen': 'https://twitter.com/unstoppableCarl',
  darkzaitzev: 'https://www.deviantart.com/darkzaitzev',
  delapouite: 'https://delapouite.com',
  faithtoken: 'https://www.deviantart.com/fungustoken',
  felbrigg: 'https://blackdogofdoom.blogspot.com',
  guard13007: 'https://guard13007.com',
  'heavenly-dog': 'https://www.gnomosygoblins.blogspot.com',
  'john-colburn': 'https://ninmunanmu.com',
  'john-redman': 'https://www.uniquedicetowers.com',
  lorc: 'https://lorcblog.blogspot.com',
  'lord-berandas': 'https://www.deviantart.com/berandas',
  sbed: 'https://opengameart.org/content/95-game-icons',
  sparker: 'https://citizenparker.com',
  'viscious-speed': 'https://www.deviantart.com/viscious-speed',
  willdabeast: 'https://wjbstories.blogspot.com',
};

const SITE = 'https://game-icons.net/';
const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'over', 'under']);

export function humanizeSlug(s) {
  return String(s || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function artistLicense(artist) {
  return CC0_ARTISTS.has(artist) ? 'CC0' : 'CC-BY 3.0';
}

export function artistName(artist) {
  return ARTIST_NAMES[artist] || humanizeSlug(artist) || artist;
}

export function artistUrl(artist) {
  return ARTIST_URLS[artist] || SITE;
}

export function iconPreviewUrl(artist, name) {
  return `https://game-icons.net/icons/ffffff/000000/1x1/${artist}/${name}.svg`;
}

export function iconPageUrl(artist, name) {
  return `https://game-icons.net/1x1/${artist}/${name}.html`;
}

/** Parse `artist/name.svg` tree path → { artist, name } or null. */
export function parseSvgPath(path) {
  if (typeof path !== 'string' || !path.toLowerCase().endsWith('.svg')) return null;
  if (!path.includes('/')) return null; // skip root noise
  const parts = path.split('/');
  if (parts.length !== 2) return null; // artist/name.svg only
  const [artist, file] = parts;
  if (!artist || !file || file.includes('..')) return null;
  const name = file.replace(/\.svg$/i, '');
  if (!name || !/^[a-z0-9][a-z0-9_-]*$/i.test(artist) || !/^[a-z0-9][a-z0-9_-]*$/i.test(name)) return null;
  return { artist, name };
}

export function mapGameIcon(row) {
  if (!row || typeof row !== 'object') return null;
  const parsed = row.artist && row.name
    ? { artist: String(row.artist), name: String(row.name) }
    : parseSvgPath(row.path);
  if (!parsed) return null;
  const { artist, name } = parsed;
  const title = humanizeSlug(name);
  if (!title) return null;
  const preview = iconPreviewUrl(artist, name);
  const tags = [
    'icon',
    'game-icons',
    ...title.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOP.has(w)),
  ].slice(0, 16);
  return {
    source: 'game-icons',
    sourceId: `${artist}/${name}`,
    title,
    creator: artistName(artist),
    creatorUrl: artistUrl(artist),
    license: artistLicense(artist),
    url: iconPageUrl(artist, name),
    thumbnail: preview,
    image: preview,
    kind: '2d',
    style: null,
    formats: ['SVG'],
    tags,
    downloadUrl: preview,
  };
}

/**
 * List SVGs via GitHub Trees API (single request; do not download SVG bodies).
 * fetchImpl may inject Authorization when GITHUB_TOKEN is set by the caller.
 */
export async function crawlGameIcons({
  sleep, fetchImpl = fetch, log = console.log, maxItems = Infinity, token,
} = {}) {
  void sleep; // no per-item HTTP; sleep kept for crawl-source signature parity
  const headers = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  const tok = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (tok) headers.Authorization = `Bearer ${tok}`;
  let r;
  try {
    r = await fetchImpl(TREE_URL, { headers });
  } catch (e) {
    log(`game-icons tree: ${e.message}`);
    return [];
  }
  if (!r.ok) {
    log(`game-icons tree: HTTP ${r.status}`);
    return [];
  }
  const body = await r.json();
  const tree = Array.isArray(body.tree) ? body.tree : [];
  const out = [];
  const seen = new Set();
  for (const node of tree) {
    if (out.length >= maxItems) break;
    if (!node || node.type !== 'blob') continue;
    const it = mapGameIcon({ path: node.path });
    if (!it || seen.has(it.sourceId)) continue;
    seen.add(it.sourceId);
    out.push(it);
  }
  log(`game-icons: ${out.length}`);
  return out;
}
