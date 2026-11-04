import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWikimedia } from '../src/sources/wikimedia.mjs';
const page = lic => ({ pageid: 1, title: 'File:Rock_texture.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/a.jpg?x=1', thumburl: 'https://thumb.wikimedia.org/t.jpg?y', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Rock_texture.jpg', mime: 'image/jpeg', size: 10, width: 2048, height: 1024,
  extmetadata: { LicenseShortName: { value: lic }, Artist: { value: '<a href="x">Jane</a>' } } }] });
test('wikimedia keeps CC0 only, credits artist, links source', () => {
  const it = mapWikimedia(page('CC0'), 'texture');
  assert.equal(it.license, 'CC0'); assert.equal(it.creator, 'Jane'); assert.equal(it.textureRes, 2048);
  assert.equal(it.thumbnail, 'https://thumb.wikimedia.org/t.jpg'); assert.match(it.url, /^https:\/\/commons\.wikimedia\.org\//);
  assert.equal(mapWikimedia(page('CC BY-SA 4.0')), null); assert.equal(mapWikimedia(page('Public domain')), null);
});
