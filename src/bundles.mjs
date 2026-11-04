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
  { slug: 'audio', title: 'Audio', description: 'Sound effects and music.', match: i => has(i, 'categories', 'audio') },
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
