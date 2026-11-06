import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSitemap, extractDetail, mapShareTextures } from '../src/sources/sharetextures.mjs';
import { normalizeItem } from '../src/lib.mjs';

const detail = {
  title: 'Apple 2', slug: 'apple_2', text1Licence: 'CC0', isEarlyAccess: false, text1Resolution: 4096,
  categoryName: 'Food', itemTypeName: 'Models', tagNames: ['apple', 'share textures'],
  previewImage1: { originalObjectKey: 'u/a.webp', thumbObjectKey: 'u/a-min.webp' },
  authors: [{ author: { name: { firstName: 'M.Tolga', lastName: 'Arslan' } } }],
  downloadLinks: [{ title: 'Blender' }, { title: 'FBX' }, { title: '1K Textures' }],
};
const url = 'https://www.sharetextures.com/models/food/apple_2';

test('sitemap keeps free asset types and skips paid products', () => {
  const xml = `<loc>${url}</loc><loc>https://www.sharetextures.com/products/x/y</loc><loc>https://www.sharetextures.com/textures/wood/oak</loc>`;
  assert.deepEqual(parseSitemap(xml), [url, 'https://www.sharetextures.com/textures/wood/oak']);
});

test('maps a CC0 model with preview, creator, formats and link-only URL', () => {
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { itemDetail: { data: detail } } } })}</script>`;
  const i = normalizeItem(mapShareTextures(extractDetail(html), url));
  assert.equal(i.license, 'CC0');
  assert.equal(i.url, url);
  assert.equal(i.kind, '3d');
  assert.deepEqual(i.formats, ['BLEND', 'FBX']);
  assert.equal(i.image, 'https://images.sharetextures.com/u/a.webp');
  assert.equal(i.thumbnail, 'https://images.sharetextures.com/u/a-min.webp');
  assert.equal(i.creator, 'M.Tolga Arslan / ShareTextures');
  assert.equal(i.textureRes, 4096);
  assert.ok(!i.tags.includes('share textures'));
  assert.equal(i.downloadUrl, null);
});

test('rejects non-CC0 and early-access items', () => {
  assert.equal(mapShareTextures({ ...detail, text1Licence: 'Royalty Free' }, url), null);
  assert.equal(mapShareTextures({ ...detail, isEarlyAccess: true }, url), null);
});
