import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSketchfab, sketchfabLicense, crawlSketchfab } from '../src/sources/sketchfab.mjs';
import { normalizeItem } from '../src/lib.mjs';
const m = { uid: 'abc123', name: 'Rocket', isDownloadable: true, viewerUrl: 'https://sketchfab.com/3d-models/rocket-abc123', embedUrl: 'https://sketchfab.com/models/abc123/embed',
  faceCount: 12000, vertexCount: 7000, license: { slug: 'by', label: 'CC Attribution' }, user: { username: 'bob', displayName: 'Bob B', profileUrl: 'https://sketchfab.com/bob' },
  thumbnails: { images: [{ width: 256, url: 'https://media.sketchfab.com/t256.jpg' }, { width: 1920, url: 'https://media.sketchfab.com/t1920.jpg' }, { width: 64, url: 'https://media.sketchfab.com/t64.jpg' }] },
  archives: { glb: { size: 900 }, gltf: { size: 1200 } }, categories: [{ name: 'science-technology' }], tags: [{ name: 'space' }] };
test('license mapping: only CC0 and CC-BY', () => {
  assert.equal(sketchfabLicense({ label: 'CC0 Public Domain' }), 'CC0');
  assert.equal(sketchfabLicense({ slug: 'by', label: 'CC Attribution' }), 'CC-BY 4.0');
  for (const l of [{ slug: 'by-nc', label: 'CC Attribution-NonCommercial' }, { slug: 'by-sa', label: 'CC Attribution-ShareAlike' }, { slug: 'by-nd', label: 'CC Attribution-NoDerivs' }, { label: 'Standard' }]) assert.equal(sketchfabLicense(l), null, l.label);
});
test('mapping: page link, creator credit, largest image, faceCount, embed, no download', () => {
  const i = normalizeItem(mapSketchfab(m));
  assert.equal(i.url, 'https://sketchfab.com/3d-models/rocket-abc123'); assert.equal(i.creator, 'Bob B'); assert.match(i.attribution, /"Rocket" by Bob B .*CC-BY 4.0/);
  assert.equal(i.image, 'https://media.sketchfab.com/t1920.jpg'); assert.equal(i.thumbnail, 'https://media.sketchfab.com/t256.jpg');
  assert.equal(i.triangles, 12000); assert.equal(i.embedUrl, 'https://sketchfab.com/models/abc123/embed'); assert.equal(i.downloadUrl, null);
  assert.ok(i.formats.includes('GLB'));
  assert.equal(mapSketchfab({ ...m, isDownloadable: false }), null);
  assert.equal(normalizeItem(mapSketchfab({ ...m, embedUrl: 'https://evil.example/embed' })).embedUrl ?? null, null);
});
test('crawler sends token only as header and never stores it', async () => {
  const KEY = 'SKTOKEN999'; const seen = [];
  const out = await crawlSketchfab({ sleep: async () => {}, key: KEY, log: () => {}, pagesTop: 1, pagesQuery: 1,
    fetchImpl: async (url, init) => { seen.push([url, init]); return { ok: true, status: 200, json: async () => ({ results: [m], next: null }) }; } });
  for (const [u, init] of seen) { assert.ok(!u.includes(KEY)); assert.equal(init.headers.Authorization, `Token ${KEY}`); assert.match(u, /downloadable=true/); assert.match(u, /license=(cc0|by)/); }
  assert.ok(!JSON.stringify(out).includes(KEY)); assert.equal(out.length, 1);
});
