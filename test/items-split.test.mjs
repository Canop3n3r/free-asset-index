import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadItemsFromPath, makeServer } from '../server.mjs';
import { MAX_PUBLISHED_JSON_BYTES } from '../src/publish-limits.mjs';
import { normalizeItem } from '../src/lib.mjs';

test('docs describe items.json as a manifest, not a full array dump', () => {
  const openapi = JSON.parse(readFileSync(new URL('../web/openapi.json', import.meta.url)));
  const itemsPath = openapi.paths['/api/items.json'];
  assert.ok(itemsPath);
  assert.match(itemsPath.get.summary, /manifest/i);
  assert.equal(itemsPath.get.responses['200'].content['application/json'].schema.type, 'object');
  assert.ok(openapi.paths['/api/source/{name}.json']);
  const llms = readFileSync(new URL('../web/llms.txt', import.meta.url), 'utf8');
  assert.match(llms, /manifest/i);
  assert.match(llms, /api\/source\//);
  const apiHtml = readFileSync(new URL('../web/api.html', import.meta.url), 'utf8');
  assert.match(apiHtml, /manifest/i);
  assert.match(apiHtml, /search-index\.json/);
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /manifest only/);
  assert.match(readme, /85 MB/);
});

test('published dist has items manifest + shards, not a giant items array', () => {
  const distApi = new URL('../dist/api/', import.meta.url);
  if (!existsSync(distApi)) {
    // Fresh checkout without a prior build: skip size assertions; build test covers write shape.
    return;
  }
  const items = JSON.parse(readFileSync(new URL('items.json', distApi)));
  assert.ok(!Array.isArray(items), 'api/items.json must not be an item array');
  assert.equal(items.schema, 'free-asset-index/items-manifest/v1');
  assert.ok(Array.isArray(items.shards) && items.shards.length > 0);
  assert.equal(typeof items.total, 'number');
  assert.ok(items.total > 0);
  let shardCount = 0;
  for (const s of items.shards) {
    assert.ok(s.source && s.path && typeof s.count === 'number');
    const shardFile = new URL(s.path, distApi);
    assert.ok(existsSync(shardFile), `missing shard ${s.path}`);
    const arr = JSON.parse(readFileSync(shardFile));
    assert.ok(Array.isArray(arr));
    assert.equal(arr.length, s.count);
    shardCount += s.count;
  }
  assert.equal(shardCount, items.total);
  const meta = JSON.parse(readFileSync(new URL('meta.json', distApi)));
  assert.equal(meta.total, items.total);
  for (const name of Object.keys(meta.bySource || {})) {
    assert.ok(items.shards.some(s => s.source === name), `manifest missing source ${name}`);
  }
  const si = JSON.parse(readFileSync(new URL('search-index.json', distApi)));
  assert.ok(Array.isArray(si));
  assert.equal(si.length, items.total);
  // Soft guard: no published JSON over 85 MB (and items.json itself must stay tiny).
  assert.ok(statSync(new URL('items.json', distApi)).size < 256 * 1024, 'manifest should be small');
  function walk(dir, rel = '') {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, r);
      else if (e.name.endsWith('.json')) assert.ok(statSync(p).size <= MAX_PUBLISHED_JSON_BYTES, `${r} exceeds 85 MB`);
    }
  }
  walk(distApi.pathname, 'api');
});

test('server loads items-manifest by stitching source shards', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fai-manifest-'));
  const a = [normalizeItem({ source: 'kenney', sourceId: 'a', title: 'A', creator: 'Kenney', license: 'CC0', url: 'https://kenney.nl/a', formats: ['GLB'] })];
  const b = [normalizeItem({ source: 'polyhaven', sourceId: 'b', title: 'Chair', creator: 'X', license: 'CC0', url: 'https://polyhaven.com/a/b', formats: ['GLB'] })];
  mkdirSync(join(dir, 'source'));
  writeFileSync(join(dir, 'source/kenney.json'), JSON.stringify(a));
  writeFileSync(join(dir, 'source/polyhaven.json'), JSON.stringify(b));
  writeFileSync(join(dir, 'items.json'), JSON.stringify({
    schema: 'free-asset-index/items-manifest/v1',
    total: 2,
    shards: [
      { source: 'kenney', path: 'source/kenney.json', count: 1 },
      { source: 'polyhaven', path: 'source/polyhaven.json', count: 1 },
    ],
  }));
  const loaded = await loadItemsFromPath(join(dir, 'items.json'));
  assert.equal(loaded.length, 2);
  const srv = await makeServer({ itemsPath: join(dir, 'items.json') });
  await new Promise(r => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const r = await (await fetch(`${base}/api/search?q=chair`)).json();
  assert.equal(r.total, 1);
  assert.equal(r.results[0].source, 'polyhaven');
  srv.close();
});

test('MAX_PUBLISHED_JSON_BYTES stays at 85 MB', () => {
  assert.equal(MAX_PUBLISHED_JSON_BYTES, 85 * 1024 * 1024);
});
