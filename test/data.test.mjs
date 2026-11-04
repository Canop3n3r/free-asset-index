import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeItem } from '../src/lib.mjs';
const items = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url)));
test('every indexed item is valid, link-only, and licensed', () => {
  const ids = new Set();
  for (const i of items) {
    assert.deepEqual(normalizeItem({ ...i, sourceId: i.id.split(':').slice(1).join(':') }), i);
    assert.ok(!ids.has(i.id), 'dup ' + i.id); ids.add(i.id);
    assert.doesNotMatch(i.url, /\.(zip|glb|fbx|obj|blend|png|7z)$/i, 'must link to source page, not file');
  }
});
