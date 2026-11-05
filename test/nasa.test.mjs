import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapNasa } from '../src/sources/nasa.mjs';
import { normalizeItem } from '../src/lib.mjs';
const e = (extra = {}) => ({ data: [{ media_type: 'image', nasa_id: 'iss001', title: 'ISS', center: 'JSC', keywords: ['ISS'], ...extra }], links: [{ href: 'https://images-assets.nasa.gov/image/iss001/iss001~thumb.jpg', rel: 'preview' }, { href: 'https://images-assets.nasa.gov/image/iss001/iss001~medium.jpg' }, { href: 'https://images-assets.nasa.gov/image/iss001/iss001~orig.jpg', rel: 'canonical', width: 3000, height: 2000, size: 900 }] });
test('maps NASA image to Public Domain with credit, source URL and preview', () => {
  const it = normalizeItem(mapNasa(e()));
  assert.equal(it.license, 'Public Domain');
  assert.equal(it.licenseUrl, 'https://creativecommons.org/publicdomain/mark/1.0/');
  assert.equal(it.creator, 'NASA JSC');
  assert.equal(it.url, 'https://images.nasa.gov/details/iss001');
  assert.match(it.thumbnail, /~thumb\.jpg$/);
  assert.match(it.downloadUrl, /~orig\.jpg$/);
});
test('skips third-party credited images', () => {
  assert.equal(mapNasa(e({ secondary_creator: 'NASA/ESA/STScI' })), null);
  assert.equal(mapNasa(e({ photographer: 'Getty Images' })), null);
  assert.equal(mapNasa(e({ description: 'Photo © 2020 Someone' })), null);
  assert.equal(mapNasa({ data: [{ media_type: 'video', nasa_id: 'v' }] }), null);
});
test('blank title falls back to nasa_id', () => {
  const d = { data: [{ media_type: 'image', nasa_id: 'x1', title: '  ' }], links: [] };
  assert.equal(mapNasa(d).title, 'x1');
});
