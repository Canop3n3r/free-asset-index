import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/classify.mjs';
import { buildBundles } from '../src/bundles.mjs';
import { normalizeItem } from '../src/lib.mjs';
const mk = (o) => normalizeItem({ source: 'opengameart', creator: 'C', license: 'CC0', url: 'https://x.y/' + o.sourceId, ...o });

test('classify categories from title/tags/kind', () => {
  assert.ok(classify(mk({ sourceId: 'a', title: 'Spaceship Pack', kind: '3d' })).categories.includes('space'));
  assert.ok(classify(mk({ sourceId: 'b', title: 'Low Poly Cars', kind: '3d' })).categories.includes('vehicles'));
  assert.ok(classify(mk({ sourceId: 'c', title: 'Pine Tree', tags: ['forest'] })).categories.includes('nature'));
  assert.ok(classify(mk({ sourceId: 'd', title: 'Brick', kind: 'texture' })).categories.includes('textures'));
  assert.ok(classify(mk({ sourceId: 'e', title: 'Sky', kind: 'hdri' })).categories.includes('hdris'));
  assert.ok(classify(mk({ sourceId: 'f', title: 'Button set', tags: ['gui'] })).categories.includes('ui'));
  assert.ok(classify(mk({ sourceId: 'g', title: 'Knight', tags: ['character'] })).categories.includes('characters'));
  assert.ok(classify(mk({ sourceId: 'h', title: 'Wooden crate', kind: '3d' })).categories.includes('props'));
  assert.ok(!classify(mk({ sourceId: 'i', title: 'Cartography table' })).categories.includes('vehicles'), 'word boundaries');
});
test('classify avoids false positives', () => {
  const t = classify(mk({ sourceId: 'x', title: 'Asphalt 02', kind: 'texture', tags: ['man made', 'road', 'music'] }));
  assert.ok(!t.categories.includes('characters')); assert.ok(!t.categories.includes('audio'));
  assert.ok(!classify(mk({ sourceId: 'y', title: 'Boombox', kind: '3d', tags: ['music'] })).categories.includes('audio'), 'audio needs an audio asset');
  assert.ok(classify(mk({ sourceId: 'z', title: 'Footsteps', kind: 'audio' })).categories.includes('audio'));
});
test('polyhaven object categories come from title, not noisy tags', () => {
  const c = classify(mk({ source: 'polyhaven', sourceId: 'p', title: 'Cassette Player', kind: '3d', tags: ['vehicle', 'player', 'animal'] })).categories;
  assert.ok(!c.includes('vehicles') && !c.includes('characters'));
});
test('classify styles', () => {
  assert.equal(classify(mk({ sourceId: 'a', title: 'X', style: 'low-poly' })).styles[0], 'low-poly');
  assert.ok(classify(mk({ sourceId: 'b', title: 'PSX retro gun' })).styles.includes('psx'));
  assert.ok(classify(mk({ sourceId: 'c', title: '16x16 tiles' })).styles.includes('pixel'));
  assert.ok(classify(mk({ sourceId: 'd', title: 'Chair', source: 'polyhaven' })).styles.includes('realistic'));
});
test('bundles: filters, attribution block, skips empty/small', () => {
  const items = [mk({ sourceId: 'a', title: 'Spaceship', kind: '3d', formats: ['GLB'], style: 'low-poly' }), mk({ sourceId: 'b', title: 'Rocket', kind: '3d', formats: ['FBX'], license: 'CC-BY 4.0' })];
  const b = buildBundles(items.map(i => ({ ...i, ...classify(i) })), { minItems: 1 });
  const space = b.find(x => x.slug === 'space-kit');
  assert.equal(space.items.length, 2);
  for (const i of space.items) assert.ok(i.url && i.license && i.licenseUrl && i.creator && i.attribution);
  assert.match(space.attribution, /Spaceship[\s\S]*Rocket/);
  assert.equal(b.find(x => x.slug === 'cc0-only-everything').items.length, 1);
  assert.deepEqual(b.find(x => x.slug === 'glb-game-ready').items.map(i => i.title), ['Spaceship']);
  assert.ok(!b.some(x => x.items.length === 0));
  assert.ok(!buildBundles([], {}).length);
});
