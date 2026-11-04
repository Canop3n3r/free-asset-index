import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/classify.mjs';
import { dedup, qualityScore } from '../src/quality.mjs';
import { normalizeItem } from '../src/lib.mjs';
const mk = o => normalizeItem({ source: 'polyhaven', creator: 'C', license: 'CC0', url: 'https://x.y/' + o.sourceId, kind: '3d', ...o });
const cats = o => classify(mk(o)).categories;

test('known misclassifications', () => {
  assert.deepEqual(cats({ sourceId: 'a', title: 'Propane Tank' }).includes('vehicles'), false);
  assert.ok(cats({ sourceId: 'a', title: 'Propane Tank' }).includes('props'));
  assert.ok(!cats({ sourceId: 'b', title: 'Small Lpg Tank' }).includes('vehicles'));
  assert.ok(!cats({ sourceId: 'c', title: 'Hand Plane No4' }).includes('vehicles'), 'woodworking plane');
  assert.ok(!cats({ sourceId: 'd', title: 'Hand Truck' }).includes('vehicles'));
  assert.ok(!cats({ sourceId: 'e', title: 'Fish Knife' }).includes('characters'));
  assert.ok(!cats({ sourceId: 'f', title: 'Bronze Whale Statue' }).includes('characters'));
  assert.ok(cats({ sourceId: 'f', title: 'Bronze Whale Statue' }).includes('props'));
  assert.ok(cats({ sourceId: 'g', title: 'Animated Tanks Pack', source: 'quaternius' }).includes('vehicles'), 'military tanks still vehicles');
  assert.ok(cats({ sourceId: 'h', title: 'Cars Pack' }).includes('vehicles'));
  assert.ok(cats({ sourceId: 'i', title: 'Covered Car' }).includes('vehicles'));
});

test('dedup merges same title+creator across ids, keeping the richer item', () => {
  const a = mk({ sourceId: 'a', title: 'Nature Kit', creator: 'Kenney', source: 'kenney', formats: ['GLB'] });
  const b = mk({ sourceId: 'b', title: 'Nature  kit', creator: 'Kenney', source: 'opengameart', formats: ['GLB', 'FBX'], thumbnail: 'https://x.y/t.png' });
  const c = mk({ sourceId: 'c', title: 'Nature Kit', creator: 'Other' });
  const out = dedup([a, b, c]);
  assert.equal(out.length, 2);
  const k = out.find(i => i.creator === 'Kenney');
  assert.equal(k.id, 'opengameart:b'); assert.deepEqual(k.alsoAt, ['https://x.y/a']);
  assert.equal(dedup([a, a]).length, 1);
});

test('qualityScore 0..100 rewards preview, formats, tags, attribution-free license', () => {
  const lo = qualityScore(mk({ sourceId: 'a', title: 'X', license: 'CC-BY 3.0' }));
  const hi = qualityScore(mk({ sourceId: 'b', title: 'X', thumbnail: 'https://x.y/t.png', formats: ['GLB', 'FBX'], tags: ['a', 'b', 'c', 'd'] }));
  assert.ok(lo >= 0 && hi <= 100 && hi > lo);
});
test('dedup caps alsoAt at 5 and records the total', () => {
  const many = Array.from({ length: 9 }, (_, n) => mk({ sourceId: 'm' + n, title: 'Pongo abelii', creator: 'NMNH' }));
  const [one] = dedup(many);
  assert.equal(one.alsoAt.length, 5); assert.equal(one.alsoAtCount, 8);
});
