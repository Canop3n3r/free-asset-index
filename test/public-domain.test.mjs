import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attribution, search, normalizeItem, LICENSES } from '../src/lib.mjs';

const pd = normalizeItem({ source: 'wikimedia', sourceId: 'n1', title: 'Saturn V', creator: 'NASA', license: 'Public Domain', url: 'https://commons.wikimedia.org/wiki/File:x.jpg', formats: ['JPG'], kind: '2d', tags: ['rocket'] });

test('Public Domain is an accepted license with no attribution requirement', () => {
  assert.equal(LICENSES['Public Domain'].requiresAttribution, false);
  assert.match(LICENSES['Public Domain'].url, /^https:\/\//);
  assert.equal(pd.licenseUrl, LICENSES['Public Domain'].url);
});

test('attribution line works for Public Domain', () => {
  assert.match(attribution(pd), /"Saturn V" by NASA .*Public Domain \(https:/);
});

test('license filter matches Public Domain', () => {
  assert.equal(search([pd], { license: 'Public Domain' }).results.length, 1);
  assert.equal(search([pd], { license: 'CC0' }).results.length, 0);
});

test('UI dropdowns include Wikimedia source and Public Domain license', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  assert.match(html, /<option value="wikimedia">Wikimedia Commons<\/option>/);
  assert.match(html, /<option value="Public Domain">Public Domain<\/option>/);
});
