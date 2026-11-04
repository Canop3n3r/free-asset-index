// Rule-based tag taxonomy from title, tags, kind and source metadata.
const W = words => new RegExp(`\\b(${words.join('|')})s?\\b`, 'i');
const CATEGORY_RULES = {
  vehicles: W(['car', 'truck', 'vehicle', 'tank', 'bus', 'train', 'boat', 'ship', 'plane', 'airplane', 'aircraft', 'helicopter', 'motorcycle', 'bike', 'bicycle', 'kart', 'racing', 'van', 'tractor', 'watercraft']),
  space: W(['space', 'spaceship', 'starship', 'rocket', 'planet', 'asteroid', 'satellite', 'galaxy', 'alien', 'ufo', 'astronaut', 'sci-fi', 'scifi', 'spacecraft', 'moon']),
  nature: W(['tree', 'forest', 'plant', 'grass', 'flower', 'rock', 'stone', 'bush', 'nature', 'foliage', 'weed', 'hedge', 'leaf', 'leaves', 'mushroom', 'terrain', 'cliff', 'log', 'shrub', 'fern', 'pine', 'ground']),
  buildings: W(['building', 'house', 'castle', 'tower', 'city', 'town', 'village', 'wall', 'dungeon', 'architecture', 'modular', 'interior', 'church', 'shop', 'barn', 'ruin', 'bridge', 'fence', 'road']),
  characters: W(['character', 'knight', 'zombie', 'monster', 'woman', 'women', 'human', 'creature', 'enemy', 'hero', 'npc', 'animal', 'dinosaur', 'robot', 'mech', 'avatar', 'person', 'people', 'skeleton', 'fish', 'mob']),
  props: W(['prop', 'crate', 'barrel', 'chair', 'table', 'furniture', 'weapon', 'gun', 'sword', 'food', 'tool', 'lamp', 'box', 'bottle', 'chest', 'item', 'shelf', 'sofa', 'bed', 'kit', 'decoration', 'blaster', 'camera', 'statue', 'sculpture', 'toy', 'knife', 'tank', 'canister', 'cart', 'trolley']),
  textures: W(['texture', 'material', 'pbr', 'seamless', 'tileable']),
  hdris: W(['hdri', 'skybox', 'hdr']),
  water: W(['water', 'ocean', 'sea', 'lake', 'river', 'wave', 'pond', 'puddle', 'underwater', 'shore', 'waterfall']),
  launchpads: /\b(launch\s*pads?|landing\s*pads?|helipads?|spaceports?|tarmac|runways?|airstrips?|launch\s*(site|tower|complex)s?)\b/i,
  ui: W(['ui', 'gui', 'hud', 'icon', 'button', 'interface', 'menu', 'font', 'cursor', 'prompt']),
};
const STYLE_RULES = {
  'low-poly': W(['low-poly', 'low poly', 'lowpoly', 'polygonal']),
  psx: W(['psx', 'ps1', 'playstation', 'retro 3d']),
  pixel: /\b(pixel|8-?bit|16-?bit|1-bit|\d{1,2}x\d{1,2})\b/i,
  stylized: W(['stylized', 'stylised', 'toon', 'cartoon', 'cute', 'hand-painted', 'handpainted']),
  realistic: W(['realistic', 'photoreal', 'photoscan', 'scanned', 'pbr']),
};
// Negative rules: phrases that look like a category keyword but aren't (checked on the same text).
const NEGATIVE = {
  vehicles: /\b(propane|lpg|gas|fuel|water|oxygen|fish|septic|storage|oil|air)\s+tanks?\b|\bhand\s+(plane|truck)s?\b|\bplane\s+no\b|\b(welding|hand|shopping|tea|cable)\s+(cart|truck)s?\b/i,
  characters: /\b(statue|knife|knives|head|toy|trap|figurine|bust|sculpture|carved|ornament|skull|cassette)\b/i,
};
export const CATEGORIES = [...Object.keys(CATEGORY_RULES), 'audio'];
export const AUDIO_TYPES = ['sfx', 'ambience', 'music'];
// Textures/HDRIs are surfaces, not objects: only these keyword categories apply to them.
const SURFACE_OK = new Set(['nature', 'buildings', 'textures', 'water', 'launchpads']);
const MAPS = { color: /\b(color|colour|albedo|diffuse|basecolor)\b/i, normal: /\bnormal\b/i, roughness: /\brough(ness)?\b/i, displacement: /\b(displacement|height|bump)\b/i, 'ambient-occlusion': /\b(ao|ambient[- ]occlusion)\b/i, metalness: /\bmetal(ness|lic)\b/i, opacity: /\b(opacity|alpha)\b/i, emission: /\bemissi(ve|on)\b/i };
const AUDIO = { music: W(['music', 'song', 'melody', 'chiptune', 'soundtrack', 'beat', 'piano', 'guitar', 'orchestral']), ambience: W(['ambience', 'ambient', 'atmosphere', 'soundscape', 'background', 'room tone', 'field recording', 'drone']) };
export const STYLES = Object.keys(STYLE_RULES);

export function classify(item) {
  const text = `${item.title} ${(item.tags || []).join(' ')}`;
  // Poly Haven tags are broad descriptors (e.g. 'player', 'vehicle' on unrelated props): use titles for object categories.
  const objText = item.source === 'polyhaven' ? item.title : text;
  const OBJ = new Set(['vehicles', 'space', 'characters', 'props', 'ui']);
  if (item.kind === 'hdri') return { categories: ['hdris'], styles: item.style === 'realistic' || item.source === 'polyhaven' ? ['realistic'] : [] };
  if (item.kind === 'audio') { const t = `${item.title} ${(item.tags || []).join(' ')}`; return { categories: ['audio'], styles: [], audio: AUDIO.music.test(t) ? 'music' : AUDIO.ambience.test(t) ? 'ambience' : 'sfx' }; }
  const surface = item.kind === 'texture';
  const categories = new Set(Object.keys(CATEGORY_RULES).filter(c => CATEGORY_RULES[c].test(OBJ.has(c) ? objText : text) && !(NEGATIVE[c] && NEGATIVE[c].test(OBJ.has(c) ? objText : text)) && (!surface || SURFACE_OK.has(c))));
  let audio;
  if (item.kind === 'audio') { categories.add('audio'); audio = AUDIO.music.test(text) ? 'music' : AUDIO.ambience.test(text) ? 'ambience' : 'sfx'; }
  if (item.kind === 'texture') categories.add('textures');
  if (item.kind === 'hdri') categories.add('hdris');
  if (item.kind === '3d' && !categories.size) categories.add('props');
  const styles = new Set();
  if (item.style === 'low-poly') styles.add('low-poly');
  if (item.style === 'pixel') styles.add('pixel');
  if (item.style === 'cartoon' || item.style === 'flat') styles.add('stylized');
  if (item.style === 'realistic' || item.source === 'polyhaven') styles.add('realistic');
  for (const s of STYLES) if (STYLE_RULES[s].test(text)) styles.add(s);
  const out = { categories: [...categories], styles: [...styles] };
  if (audio) out.audio = audio;
  if (item.kind === 'texture') {
    const maps = new Set((item.maps || []).map(m => String(m).toLowerCase()));
    for (const [m, re] of Object.entries(MAPS)) if (re.test(text)) maps.add(m);
    out.maps = [...maps];
  }
  return out;
}
