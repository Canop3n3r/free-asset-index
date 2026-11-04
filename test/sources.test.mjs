import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapAmbientCG } from '../src/sources/ambientcg.mjs';
import { previewFor } from '../src/previews.mjs';
import { normalizeItem } from '../src/lib.mjs';

test('ambientCG mapping: CC0, source link, best preview, kind/formats', () => {
  const r = mapAmbientCG({ assetId: 'Bark016', displayName: 'Bark 016', dataType: 'Material', tags: ['bark', 'mossy', '016'], displayCategory: 'Bark',
    shortLink: 'https://ambientcg.com/a/Bark016', previewImage: { '256-PNG': 'https://m/256.png', '1024-JPG-FFFFFF': 'https://m/1024.jpg', '512-PNG': 'https://m/512.png' } });
  const i = normalizeItem(r);
  assert.equal(i.license, 'CC0'); assert.equal(i.url, 'https://ambientcg.com/a/Bark016'); assert.equal(i.kind, 'texture');
  assert.equal(r.thumbnail, 'https://m/256.png'); assert.equal(r.image, 'https://m/1024.jpg');
  assert.ok(!i.tags.includes('016'));
  assert.equal(mapAmbientCG({ assetId: 'S', dataType: 'Substance', previewImage: {} }), null);
  assert.equal(mapAmbientCG({ assetId: 'H', displayName: 'Sky', dataType: 'HDRI', shortLink: 'https://ambientcg.com/a/H', previewImage: {} }).kind, 'hdri');
});

test('previewFor picks higher-res official previews', () => {
  assert.match(previewFor({ source: 'polyhaven', thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/A.png?width=256&height=256' }), /width=1024/);
  assert.equal(previewFor({ source: 'quaternius', thumbnail: 'https://quaternius.com/assets/images/thumbnails/cars.jpg' }), 'https://quaternius.com/assets/images/fullres/cars.jpg');
  assert.equal(previewFor({ source: 'opengameart', thumbnail: 'https://opengameart.org/sites/default/files/styles/medium/public/a.png' }), 'https://opengameart.org/sites/default/files/a.png');
  assert.equal(previewFor({ source: 'kenney', thumbnail: null }), null);
  assert.equal(previewFor({ source: 'ambientcg', image: 'https://m/1024.jpg', thumbnail: 'x' }), 'https://m/1024.jpg');
});

test('normalizeItem keeps image only if https', () => {
  const base = { source: 's', sourceId: 'a', title: 'T', creator: 'C', license: 'CC0', url: 'https://a.b' };
  assert.equal(normalizeItem({ ...base, image: 'https://i' }).image, 'https://i');
  assert.equal(normalizeItem({ ...base, image: 'javascript:x' }).image, null);
});
