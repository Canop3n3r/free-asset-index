import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { normalizeItem } from '../src/lib.mjs';
const files = ['../data/items.json', ...(existsSync(new URL('../data/sources/', import.meta.url)) ? readdirSync(new URL('../data/sources/', import.meta.url)).filter(f => f.endsWith('.json')).map(f => `../data/sources/${f}`) : [])];
for (const f of files) test(`every item in ${f} is valid, link-only, and licensed`, () => {
  const ids = new Set();
  for (const i of JSON.parse(readFileSync(new URL(f, import.meta.url)))) {
    const n = normalizeItem({ ...i, sourceId: i.id.split(':').slice(1).join(':') });
    for (const k of ['id', 'license', 'licenseUrl', 'creator', 'url', 'attribution']) assert.equal(n[k], i[k], `${i.id} ${k}`);
    assert.ok(!ids.has(i.id), 'dup ' + i.id); ids.add(i.id);
    assert.doesNotMatch(i.url, /\.(zip|glb|fbx|obj|blend|png|7z)$/i, 'must link to source page, not file');
  }
});
