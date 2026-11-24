import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { search } from '../src/lib.mjs';
import { slimItem } from '../src/slim.mjs';
const it = (id, quality, title = 'x') => ({ id, title, creator: 'c', creatorSlug: 'c', license: 'CC0', formats: [], tags: [], quality });
test('search sort=quality orders best first; default keeps index order', () => {
  const items = [it('a', 10), it('b', 90), it('c', 50)];
  assert.deepEqual(search(items, { sort: 'quality' }).results.map(i => i.id), ['b', 'c', 'a']);
  assert.deepEqual(search(items, {}).results.map(i => i.id), ['a', 'b', 'c']);
  assert.deepEqual(search(items, { sort: 'title' }).results.length, 3);
});
test('slimItem keeps fields cards and credits need, drops nothing license-related', () => {
  const s = slimItem({ id: 'a', title: 'T', creator: 'C', creatorSlug: 'c', creatorUrl: null, license: 'CC0', licenseUrl: 'L', url: 'U', thumbnail: 't', image: 'i', kind: '3d', style: null, styles: ['realistic'], categories: ['props'], formats: ['GLB'], tags: Array(20).fill('x'), attribution: 'A', source: 's', quality: 50, alsoAt: ['z'] });
  for (const k of ['id', 'title', 'creator', 'license', 'licenseUrl', 'url', 'thumbnail', 'image', 'formats', 'quality']) assert.ok(k in s, k);
  assert.ok(s.tags.length <= 8);
});
test('Source dropdown values match every source in the index data', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  const select = html.match(/<select id="source"[^>]*>([\s\S]*?)<\/select>/)[1];
  const options = [...select.matchAll(/<option value="([^"]*)">/g)].map(m => m[1]).filter(Boolean);
  const sources = new Set(JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url))).map(i => i.source));
  for (const f of readdirSync(new URL('../data/sources/', import.meta.url)).filter(f => f.endsWith('.json'))) {
    sources.add(f.slice(0, -5));
  }
  assert.deepEqual([...options].sort(), [...sources].sort());
  assert.match(select, /<option value="nga">National Gallery of Art<\/option>/);
});
