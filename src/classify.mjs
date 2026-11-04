// Rule-based tag taxonomy from title, tags, kind and source metadata.
const W = words => new RegExp(`\\b(${words.join('|')})s?\\b`, 'i');
const CATEGORY_RULES = {
  vehicles: W(['car', 'truck', 'vehicle', 'tank', 'bus', 'train', 'boat', 'ship', 'plane', 'airplane', 'aircraft', 'helicopter', 'motorcycle', 'bike', 'bicycle', 'kart', 'racing', 'van', 'tractor', 'watercraft']),
  space: W(['space', 'spaceship', 'starship', 'rocket', 'planet', 'asteroid', 'satellite', 'galaxy', 'alien', 'ufo', 'astronaut', 'sci-fi', 'scifi', 'spacecraft', 'moon']),
  nature: W(['tree', 'forest', 'plant', 'grass', 'flower', 'rock', 'stone', 'bush', 'nature', 'foliage', 'weed', 'hedge', 'leaf', 'leaves', 'mushroom', 'terrain', 'cliff', 'log', 'shrub', 'fern', 'pine', 'ground']),
  buildings: W(['building', 'house', 'castle', 'tower', 'city', 'town', 'village', 'wall', 'dungeon', 'architecture', 'modular', 'interior', 'church', 'shop', 'barn', 'ruin', 'bridge', 'fence', 'road']),
  characters: W(['character', 'knight', 'zombie', 'monster', 'woman', 'women', 'human', 'creature', 'enemy', 'hero', 'npc', 'animal', 'dinosaur', 'robot', 'mech', 'avatar', 'person', 'people', 'skeleton', 'fish', 'mob']),
  props: W(['prop', 'crate', 'barrel', 'chair', 'table', 'furniture', 'weapon', 'gun', 'sword', 'food', 'tool', 'lamp', 'box', 'bottle', 'chest', 'item', 'shelf', 'sofa', 'bed', 'kit', 'decoration', 'blaster', 'camera']),
  textures: W(['texture', 'material', 'pbr', 'seamless', 'tileable']),
  hdris: W(['hdri', 'skybox', 'hdr']),
  ui: W(['ui', 'gui', 'hud', 'icon', 'button', 'interface', 'menu', 'font', 'cursor', 'prompt']),
};
const STYLE_RULES = {
  'low-poly': W(['low-poly', 'low poly', 'lowpoly', 'polygonal']),
  psx: W(['psx', 'ps1', 'playstation', 'retro 3d']),
  pixel: /\b(pixel|8-?bit|16-?bit|1-bit|\d{1,2}x\d{1,2})\b/i,
  stylized: W(['stylized', 'stylised', 'toon', 'cartoon', 'cute', 'hand-painted', 'handpainted']),
  realistic: W(['realistic', 'photoreal', 'photoscan', 'scanned', 'pbr']),
};
export const CATEGORIES = [...Object.keys(CATEGORY_RULES), 'audio'];
// Textures/HDRIs are surfaces, not objects: only these keyword categories apply to them.
const SURFACE_OK = new Set(['nature', 'buildings', 'textures', 'hdris']);
export const STYLES = Object.keys(STYLE_RULES);

export function classify(item) {
  const text = `${item.title} ${(item.tags || []).join(' ')}`;
  // Poly Haven tags are broad descriptors (e.g. 'player', 'vehicle' on unrelated props): use titles for object categories.
  const objText = item.source === 'polyhaven' ? item.title : text;
  const OBJ = new Set(['vehicles', 'space', 'characters', 'props', 'ui']);
  const surface = item.kind === 'texture' || item.kind === 'hdri';
  const categories = new Set(Object.keys(CATEGORY_RULES).filter(c => CATEGORY_RULES[c].test(OBJ.has(c) ? objText : text) && (!surface || SURFACE_OK.has(c))));
  if (item.kind === 'audio') categories.add('audio');
  if (item.kind === 'texture') categories.add('textures');
  if (item.kind === 'hdri') categories.add('hdris');
  if (item.kind === '3d' && !categories.size) categories.add('props');
  const styles = new Set();
  if (item.style === 'low-poly') styles.add('low-poly');
  if (item.style === 'pixel') styles.add('pixel');
  if (item.style === 'cartoon' || item.style === 'flat') styles.add('stylized');
  if (item.style === 'realistic' || item.source === 'polyhaven') styles.add('realistic');
  for (const s of STYLES) if (STYLE_RULES[s].test(text)) styles.add(s);
  return { categories: [...categories], styles: [...styles] };
}
