import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPolyHaven } from '../src/sources/polyhaven.mjs';
import { mapAmbientCG } from '../src/sources/ambientcg.mjs';
import { normalizeItem, search } from '../src/lib.mjs';

const model = { name: 'Arm Chair', type: 2, authors: { K: 'All' }, polycount: 5626, max_resolution: [4096, 4096], categories: ['furniture'], tags: [] };
const files = { gltf: { '1k': { gltf: { url: 'https://dl.polyhaven.org/a.gltf', size: 100, include: { 'a.bin': { size: 50 }, 't.jpg': { size: 25 } } } } }, fbx: { '1k': { fbx: { url: 'https://dl.polyhaven.org/a.fbx', size: 300 } } } };
test('Poly Haven: triangles, textureRes, official download URL + size', () => {
  const i = normalizeItem(mapPolyHaven('ArmChair_01', model, files));
  assert.equal(i.triangles, 5626); assert.equal(i.textureRes, 4096);
  assert.equal(i.downloadUrl, 'https://dl.polyhaven.org/a.gltf'); assert.equal(i.fileSize, 175); assert.equal(i.downloads.length, 2);
  const noFiles = normalizeItem(mapPolyHaven('ArmChair_01', model));
  assert.equal(noFiles.downloadUrl, null); assert.equal(noFiles.url, 'https://polyhaven.com/a/ArmChair_01');
  const tex = normalizeItem(mapPolyHaven('t', { name: 'T', type: 1, max_resolution: [8192, 4096] }, { Diffuse: { '1k': { jpg: { url: 'https://dl.polyhaven.org/d.jpg', size: 10 } } }, nor_gl: { '1k': { jpg: { url: 'https://dl.polyhaven.org/n.jpg', size: 5 } } } }));
  assert.deepEqual(tex.maps, ['color', 'normal']); assert.equal(tex.fileSize, 15); assert.equal(tex.textureRes, 8192);
});
test('ambientCG: 1K zip download, max texture res, maps', () => {
  const i = normalizeItem(mapAmbientCG({ assetId: 'Water002', displayName: 'Water 002', dataType: 'Material', shortLink: 'https://ambientcg.com/a/Water002', previewImage: {},
    maps: ['color', 'normal', 'roughness'],
    downloadFolders: { default: { downloadFiletypeCategories: { zip: { downloads: [{ attribute: '4K-JPG', size: 400, downloadLink: 'https://ambientcg.com/get?file=W_4K-JPG.zip' }, { attribute: '1K-JPG', size: 10, downloadLink: 'https://ambientcg.com/get?file=W_1K-JPG.zip' }] } } } } }));
  assert.equal(i.downloadUrl, 'https://ambientcg.com/get?file=W_1K-JPG.zip'); assert.equal(i.fileSize, 10); assert.equal(i.textureRes, 4096);
  assert.deepEqual(i.maps, ['color', 'normal', 'roughness']);
});
test('URLs containing api keys/tokens are never stored', () => {
  const b = { source: 's', sourceId: 'a', title: 'T', creator: 'C', license: 'CC0', url: 'https://a.b' };
  assert.equal(normalizeItem({ ...b, downloadUrl: 'https://x/y?token=SECRET' }).downloadUrl, null);
  assert.equal(normalizeItem({ ...b, downloadUrl: 'https://x/y?api_key=SECRET' }).downloadUrl, null);
  assert.equal(normalizeItem({ ...b, downloads: [{ label: 'a', url: 'https://x?token=1' }] }).downloads, undefined);
});
test('budget filters exclude unknown values and those above limit', () => {
  const b = (id, o) => normalizeItem({ source: 's', sourceId: id, title: id, creator: 'C', license: 'CC0', url: 'https://a.b/' + id, ...o });
  const items = [b('a', { triangles: 5000, fileSize: 2 * 1048576, textureRes: 1024 }), b('b', { triangles: 80000, fileSize: 50 * 1048576, textureRes: 4096 }), b('c', {})];
  assert.deepEqual(search(items, { maxTriangles: 10000 }).results.map(i => i.id), ['s:a']);
  assert.deepEqual(search(items, { maxFileSize: 10 }).results.map(i => i.id), ['s:a']);
  assert.deepEqual(search(items, { maxTextureRes: 2048 }).results.map(i => i.id), ['s:a']);
  assert.equal(search(items, {}).total, 3);
});
