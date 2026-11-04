// Dedup across sources and a simple 0-100 quality score.
const key = i => `${i.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${i.creatorSlug}`;
const richness = i => (i.thumbnail ? 4 : 0) + (i.image ? 2 : 0) + i.formats.length + Math.min(i.tags.length, 10) / 5;
export function dedup(items) {
  const m = new Map();
  for (const i of items) {
    const k = key(i), prev = m.get(k);
    if (!prev) { m.set(k, i); continue; }
    if (prev.id === i.id) continue;
    const [keep, drop] = richness(i) > richness(prev) ? [i, prev] : [prev, i];
    m.set(k, { ...keep, alsoAt: [...new Set([...(keep.alsoAt || []), drop.url, ...(drop.alsoAt || [])])] });
  }
  return [...m.values()];
}
export function qualityScore(i) {
  let s = 20;
  if (i.thumbnail) s += 25;
  if (i.image) s += 10;
  s += Math.min(i.formats.length, 3) * 8;
  s += Math.min(i.tags.length, 5) * 3;
  if (i.license === 'CC0') s += 6;
  if (i.creatorUrl) s += 4;
  return Math.max(0, Math.min(100, s));
}
