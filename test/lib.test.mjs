import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attribution, search, slugify, normalizeItem, LICENSES, creatorStats } from '../src/lib.mjs';

const items = [
  normalizeItem({ source: 'polyhaven', sourceId: 'a', title: 'Arm Chair', creator: 'Kirill Sannikov', license: 'CC0', url: 'https://polyhaven.com/a/a', formats: ['GLB', 'FBX'], style: 'realistic', kind: '3d', tags: ['chair'] }),
  normalizeItem({ source: 'opengameart', sourceId: 'b', title: 'Pixel Knight', creator: 'Jane Doe', license: 'CC-BY 4.0', url: 'https://opengameart.org/content/b', formats: ['PNG'], style: 'pixel', kind: '2d', tags: ['knight'] }),
];

test('license table includes URL for every allowed license', () => {
  for (const l of ['CC0', 'CC-BY 3.0', 'CC-BY 4.0']) assert.match(LICENSES[l].url, /^https:\/\/creativecommons\.org\//);
});

test('normalizeItem rejects non-allowed licenses and missing fields', () => {
  assert.throws(() => normalizeItem({ ...items[0], license: 'GPL 3.0' }));
  assert.throws(() => normalizeItem({ ...items[0], creator: '' }));
  assert.equal(items[0].licenseUrl, LICENSES.CC0.url);
  assert.equal(items[0].creatorSlug, 'kirill-sannikov');
  assert.equal(items[0].id, 'polyhaven:a');
});

test('attribution line names title, creator, source and license', () => {
  assert.equal(attribution(items[1]), '"Pixel Knight" by Jane Doe (https://opengameart.org/content/b), licensed under CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/).');
  assert.match(attribution(items[0]), /CC0/);
  assert.equal(items[1].attribution, attribution(items[1]));
});

test('search filters by text, format, license, style, creator', () => {
  assert.deepEqual(search(items, { q: 'knight' }).results.map(i => i.id), ['opengameart:b']);
  assert.deepEqual(search(items, { format: 'glb' }).results.map(i => i.id), ['polyhaven:a']);
  assert.deepEqual(search(items, { license: 'cc-by' }).results.map(i => i.id), ['opengameart:b']);
  assert.deepEqual(search(items, { license: 'CC0', style: 'realistic' }).results.length, 1);
  assert.deepEqual(search(items, { creator: 'jane-doe' }).results.length, 1);
  assert.equal(search(items, {}).total, 2);
  for (const r of search(items, {}).results) assert.ok(r.license && r.licenseUrl);
});

test('search paginates with limit/offset', () => {
  const r = search(items, { limit: 1, offset: 1 });
  assert.equal(r.results.length, 1); assert.equal(r.total, 2);
});

test('creatorStats groups items', () => {
  const c = creatorStats(items);
  assert.equal(c.length, 2); assert.equal(c.find(x => x.slug === 'jane-doe').count, 1);
});

test('slugify', () => assert.equal(slugify('Ça va  Bob!'), 'ca-va-bob'));

test('GLB filter also matches GLTF assets (same glTF family)', () => {
  const g = [normalizeItem({ source: 'polyhaven', sourceId: 'g', title: 'T', creator: 'C', license: 'CC0', url: 'https://x.y/g', formats: ['GLTF'] })];
  assert.equal(search(g, { format: 'GLB' }).total, 1);
  assert.equal(search(g, { format: 'gltf' }).total, 1);
  assert.equal(search(g, { format: 'FBX' }).total, 0);
});
