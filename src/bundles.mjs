// Curated bundles: rule-defined item selections with a combined attribution block. Links only.
const has = (i, k, v) => (i[k] || []).includes(v);
const fmt = (i, ...f) => f.some(x => i.formats.includes(x));
export const BUNDLE_DEFS = [
  { slug: 'space-kit', title: 'Space Kit', description: 'Spaceships, rockets, planets and sci-fi bits.', match: i => has(i, 'categories', 'space') },
  { slug: 'low-poly-nature', title: 'Low-Poly Nature', description: 'Low-poly trees, rocks and plants.', match: i => has(i, 'categories', 'nature') && has(i, 'styles', 'low-poly') },
  { slug: 'realistic-nature', title: 'Realistic Nature', description: 'Photoreal nature models and textures.', match: i => has(i, 'categories', 'nature') && has(i, 'styles', 'realistic') },
  { slug: 'vehicles', title: 'Vehicles', description: 'Cars, trucks, boats, planes and more.', match: i => has(i, 'categories', 'vehicles') },
  { slug: 'sci-fi-props', title: 'Sci-Fi Props', description: 'Sci-fi and space props for 3D games.', match: i => has(i, 'categories', 'space') && (has(i, 'categories', 'props') || i.kind === '3d') },
  { slug: 'characters', title: 'Characters & Creatures', description: 'Characters, monsters and animals.', match: i => has(i, 'categories', 'characters') },
  { slug: 'buildings-and-cities', title: 'Buildings & Cities', description: 'Buildings, towns, dungeons and modular kits.', match: i => has(i, 'categories', 'buildings') },
  { slug: 'pixel-art-2d', title: 'Pixel Art 2D', description: 'Pixel-art sprites and tiles.', match: i => has(i, 'styles', 'pixel') },
  { slug: 'game-ui', title: 'Game UI & Icons', description: 'UI packs, icons and prompts.', match: i => has(i, 'categories', 'ui') },
  { slug: 'pbr-textures', title: 'PBR Textures', description: 'Tileable textures and materials.', match: i => has(i, 'categories', 'textures') },
  { slug: 'hdri-skies', title: 'HDRI Skies', description: 'HDRI environment maps for lighting.', match: i => has(i, 'categories', 'hdris') },
  { slug: 'audio', title: 'Audio (all)', description: 'CC0 / CC-BY sound effects, ambience and music.', match: i => has(i, 'categories', 'audio') },
  { slug: 'audio-sfx', title: 'Sound Effects', description: 'Game sound effects: impacts, UI, lasers, engines and more.', match: i => i.audio === 'sfx' },
  { slug: 'audio-ambience', title: 'Ambience', description: 'Wind, rain, ocean, forest, city and space ambience loops.', match: i => i.audio === 'ambience' },
  { slug: 'audio-music', title: 'Music', description: 'Music loops and tracks (CC0 / CC-BY).', match: i => i.audio === 'music' },
  { slug: 'smithsonian-space', title: 'Smithsonian Space Collection', description: 'CC0 3D scans of space objects and artifacts from the Smithsonian.', match: i => i.source === 'smithsonian' && (has(i, 'categories', 'space') || /\b(air and space|astro|nasa|apollo|space|rocket|lunar|mars|satellite|nebula)\b/i.test(`${i.title} ${(i.tags || []).join(' ')} ${i.creator}`)) },
  { slug: 'smithsonian-3d', title: 'Smithsonian 3D (CC0)', description: 'CC0 3D scans from the Smithsonian Open Access collection.', match: i => i.source === 'smithsonian' },
  { slug: 'water-and-ocean', title: 'Water & Ocean', description: 'Water, ocean and lake materials and models, with normal and roughness maps where available.', match: i => has(i, 'categories', 'water') },
  { slug: 'launch-pads-and-tarmac', title: 'Launch Pads, Spaceports & Tarmac', description: 'Launch pads, landing pads, runways and tarmac surfaces.', match: i => has(i, 'categories', 'launchpads') },
  { slug: 'glb-game-ready', title: 'GLB / glTF Game-Ready', description: '3D models available as GLB or glTF.', match: i => fmt(i, 'GLB', 'GLTF') },
  { slug: 'cc0-only-everything', title: 'CC0 Only (Everything)', description: 'Every public-domain asset. No credit required, though credit is appreciated.', match: i => i.license === 'CC0' },
];
const slim = i => ({ id: i.id, title: i.title, url: i.url, creator: i.creator, creatorUrl: i.creatorUrl, license: i.license, licenseUrl: i.licenseUrl, source: i.source, formats: i.formats, thumbnail: i.thumbnail, attribution: i.attribution });

export function buildBundles(items, { minItems = 3 } = {}) {
  return BUNDLE_DEFS.map(d => {
    const sel = items.filter(d.match);
    const licenses = [...new Set(sel.map(i => i.license))];
    return { slug: d.slug, title: d.title, description: d.description, count: sel.length, licenses,
      creators: [...new Set(sel.map(i => i.creator))].length,
      note: 'Links only. Download each asset from its source page and keep the credit lines.',
      attribution: sel.map(i => i.attribution).join('\n'), items: sel.map(slim) };
  }).filter(b => b.count >= minItems);
}
export const bundleIndex = bundles => bundles.map(({ items, attribution, ...b }) => ({ ...b, url: `bundles/${b.slug}.json` }));
