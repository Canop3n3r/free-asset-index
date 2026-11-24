// Browser-safe helpers to load the slim search index (manifest + shards, or a legacy item array).
export function isManifest(data) {
  return !!(data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.shards));
}

export function selectShards(manifest, source) {
  const shards = manifest?.shards || [];
  return source ? shards.filter(s => s.source === source) : shards.slice();
}

export async function readIndex(fetchImpl, url) {
  const data = await (await fetchImpl(url)).json();
  if (Array.isArray(data)) return { type: 'array', items: data };
  if (isManifest(data)) return { type: 'manifest', manifest: data };
  throw new Error('unrecognized search index');
}

export async function loadNeededItems(fetchImpl, { manifestUrl = 'api/search-index.json', source = '', loaded, index }) {
  if (!index.type) Object.assign(index, await readIndex(fetchImpl, manifestUrl));
  if (index.type === 'array') return index.items;
  const shards = selectShards(index.manifest, source);
  const missing = shards.filter(s => !loaded.has(s.path));
  await Promise.all(missing.map(async s => {
    const arr = await (await fetchImpl('api/' + s.path)).json();
    loaded.set(s.path, Array.isArray(arr) ? arr : []);
  }));
  const items = [];
  for (const s of shards) items.push(...(loaded.get(s.path) || []));
  return items;
}
