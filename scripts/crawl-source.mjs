// Crawl one API-based source into data/sources/<name>.json (never touches data/items.json).
// Usage: node scripts/crawl-source.mjs ambientcg
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { crawlFreesound } from '../src/sources/freesound.mjs';
import { crawlSmithsonian } from '../src/sources/smithsonian.mjs';
import { crawlSketchfab } from '../src/sources/sketchfab.mjs';
import { normalizeItem } from '../src/lib.mjs';
import { crawlAmbientCG } from '../src/sources/ambientcg.mjs';
import { crawlQuaternius } from '../src/sources/quaternius.mjs';
import { crawlPolyHaven } from '../src/sources/polyhaven.mjs';
import { crawlWikimedia } from '../src/sources/wikimedia.mjs';
import { crawlNasa } from '../src/sources/nasa.mjs';
import { crawlSmithsonianImages } from '../src/sources/smithsonian-images.mjs';
import { crawlCleveland } from '../src/sources/cleveland-museum.mjs';
const UA = 'free-asset-index/0.1 (+https://github.com/Canop3n3r/free-asset-index; link-only index)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (url, json) => { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return json ? r.json() : r.text(); };
const SOURCES = { ambientcg: crawlAmbientCG, quaternius: crawlQuaternius, polyhaven: crawlPolyHaven, freesound: crawlFreesound, smithsonian: crawlSmithsonian, sketchfab: crawlSketchfab, wikimedia: crawlWikimedia, nasa: crawlNasa, 'smithsonian-images': crawlSmithsonianImages, 'cleveland-museum': crawlCleveland };
// API keys are read from files at crawl time only (never committed, logged, or written to output).
const KEYS = { freesound: 'FREESOUND_API_KEY', smithsonian: 'DATA_GOV_API_KEY', 'smithsonian-images': 'DATA_GOV_API_KEY', sketchfab: 'SKETCHFAB_API_TOKEN' };
const SECRETS = process.env.SECRETS_DIR || '/home/box/secrets';
for (const name of process.argv.slice(2)) {
  const key = KEYS[name] ? (await readFile(`${SECRETS}/${KEYS[name]}`, 'utf8')).trim() : undefined;
  // smithsonian-images: reserve titles of the existing Smithsonian 3D packages so dedup never hides a 3D scan behind a photo.
  const reserved = name === 'smithsonian-images' ? JSON.parse(await readFile(new URL('../data/sources/smithsonian.json', import.meta.url), 'utf8')).map(i => `${i.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${i.creatorSlug}`) : undefined;
  const items = []; for (const r of await SOURCES[name]({ get, sleep, key, ...(reserved ? { reserved } : {}), ...(name === "freesound" && process.env.FS_PAGES ? { pages: Number(process.env.FS_PAGES) } : {}) })) { try { items.push(normalizeItem(r)); } catch (e) { console.warn(name, r.sourceId, e.message); } }
  await mkdir(new URL('../data/sources/', import.meta.url), { recursive: true });
  await writeFile(new URL(`../data/sources/${name}.json`, import.meta.url), JSON.stringify(items, null, 1));
  console.log(name, items.length);
}
