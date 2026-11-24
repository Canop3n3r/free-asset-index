import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildSearchIndex, SEARCH_INDEX_SCHEMA } from '../src/search-index.mjs';
import { isManifest, selectShards, readIndex, loadNeededItems } from '../web/load-search-index.mjs';
import { slimItem } from '../src/slim.mjs';
import { search } from '../src/lib.mjs';

const item = (source, sourceId, title = sourceId) => ({
  id: `${source}:${sourceId}`, source, title, creator: 'C', creatorSlug: 'c', creatorUrl: null,
  license: 'CC0', licenseUrl: 'L', url: 'https://example.com/' + sourceId, thumbnail: null, image: null,
  kind: '2d', style: null, styles: [], categories: [], formats: ['JPG'], tags: ['t'], quality: 50,
});

test('buildSearchIndex writes a manifest, not an item array, with per-source shards', () => {
  const items = [item('nga', '1', 'A'), item('kenney', '2', 'B'), item('nga', '3', 'C')];
  const { manifest, files } = buildSearchIndex(items);
  assert.equal(manifest.schema, SEARCH_INDEX_SCHEMA);
  assert.equal(manifest.total, 3);
  assert.ok(!Array.isArray(manifest));
  assert.ok(Array.isArray(manifest.shards));
  assert.deepEqual(manifest.shards.map(s => s.source), ['kenney', 'nga']);
  assert.equal(files['search-index/kenney.json'].length, 1);
  assert.equal(files['search-index/nga.json'].length, 2);
  assert.equal(files['search-index/nga.json'][0].id, 'nga:1');
  assert.equal(files['search-index/nga.json'][1].id, 'nga:3');
  for (const s of manifest.shards) {
    assert.equal(s.path, `search-index/${s.source}.json`);
    assert.equal(s.count, files[s.path].length);
    const body = JSON.stringify(files[s.path]);
    assert.equal(s.bytes, Buffer.byteLength(body));
    assert.equal(s.sha256, createHash('sha256').update(body).digest('hex'));
    assert.ok(s.bytes < 85 * 1024 * 1024);
  }
  const slim = items.map(slimItem);
  assert.deepEqual([...files['search-index/kenney.json'], ...files['search-index/nga.json']].map(i => i.id).sort(), slim.map(i => i.id).sort());
});

test('a source that exceeds maxBytes is split into source-0, source-1, …', () => {
  const items = [item('nasa', 'a'), item('nasa', 'b'), item('nasa', 'c'), item('kenney', 'k')];
  const one = Math.max(...items.map(i => Buffer.byteLength(JSON.stringify([slimItem(i)]))));
  const { manifest, files } = buildSearchIndex(items, { maxBytes: one });
  assert.ok(!files['search-index/nasa.json']);
  assert.ok(files['search-index/nasa-0.json'].length >= 1);
  assert.ok(files['search-index/nasa-1.json'].length >= 1);
  assert.equal(files['search-index/kenney.json'].length, 1);
  const nasa = manifest.shards.filter(s => s.source === 'nasa');
  assert.ok(nasa.length >= 2);
  assert.deepEqual(nasa.map(s => s.path), nasa.map((_, i) => `search-index/nasa-${i}.json`));
  assert.equal(nasa.reduce((n, s) => n + s.count, 0), 3);
  for (const s of manifest.shards) {
    assert.ok(s.bytes <= one + 1, `${s.path} is ${s.bytes}`);
  }
});

test('a single item larger than maxBytes throws', () => {
  assert.throws(() => buildSearchIndex([item('nasa', 'huge')], { maxBytes: 8 }), /exceeds/);
});

test('isManifest / selectShards distinguish the stub from an item array', () => {
  assert.equal(isManifest({ schema: SEARCH_INDEX_SCHEMA, total: 2, shards: [{ source: 'nga', path: 'search-index/nga.json' }, { source: 'nga', path: 'search-index/nga-1.json' }, { source: 'kenney', path: 'search-index/kenney.json' }] }), true);
  assert.equal(isManifest([{ id: 'nga:1' }]), false);
  const m = { shards: [
    { source: 'nga', path: 'search-index/nga-0.json' },
    { source: 'nga', path: 'search-index/nga-1.json' },
    { source: 'kenney', path: 'search-index/kenney.json' },
  ] };
  assert.deepEqual(selectShards(m, 'nga').map(s => s.path), ['search-index/nga-0.json', 'search-index/nga-1.json']);
  assert.deepEqual(selectShards(m, '').map(s => s.source), ['nga', 'nga', 'kenney']);
});

test('loadNeededItems on a legacy item-array index returns it unchanged', async () => {
  const arr = [item('nga', '1')];
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return { json: async () => arr }; };
  const index = {};
  const loaded = new Map();
  const items = await loadNeededItems(fetchImpl, { manifestUrl: 'api/search-index.json', source: 'nga', loaded, index });
  assert.equal(items, arr);
  assert.deepEqual(calls, ['api/search-index.json']);
  await loadNeededItems(fetchImpl, { manifestUrl: 'api/search-index.json', source: '', loaded, index });
  assert.deepEqual(calls, ['api/search-index.json']);
});

test('loadNeededItems loads only the selected source shards, then the rest for all', async () => {
  const nga = [item('nga', '1'), item('nga', '2')];
  const kenney = [item('kenney', 'k')];
  const manifest = {
    schema: SEARCH_INDEX_SCHEMA, total: 3,
    shards: [
      { source: 'kenney', path: 'search-index/kenney.json', count: 1 },
      { source: 'nga', path: 'search-index/nga.json', count: 2 },
    ],
  };
  const files = { 'api/search-index.json': manifest, 'api/search-index/kenney.json': kenney, 'api/search-index/nga.json': nga };
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (!(url in files)) throw new Error('missing ' + url);
    return { json: async () => files[url] };
  };
  const index = {};
  const loaded = new Map();
  const onlyNga = await loadNeededItems(fetchImpl, { manifestUrl: 'api/search-index.json', source: 'nga', loaded, index });
  assert.deepEqual(onlyNga.map(i => i.id), ['nga:1', 'nga:2']);
  assert.deepEqual(calls, ['api/search-index.json', 'api/search-index/nga.json']);
  const all = await loadNeededItems(fetchImpl, { manifestUrl: 'api/search-index.json', source: '', loaded, index });
  assert.deepEqual(all.map(i => i.id), ['kenney:k', 'nga:1', 'nga:2']);
  assert.deepEqual(calls, ['api/search-index.json', 'api/search-index/nga.json', 'api/search-index/kenney.json']);
});

test('readIndex rejects an unrecognized payload', async () => {
  const fetchImpl = async () => ({ json: async () => ({ foo: 1 }) });
  await assert.rejects(() => readIndex(fetchImpl, 'api/search-index.json'), /unrecognized/);
});

test('search over a selected shard matches filtering the full index', async () => {
  const nga = [item('nga', '1', 'Jug'), item('nga', '2', 'Chair')];
  const kenney = [item('kenney', 'k', 'Chair')];
  const manifest = { schema: SEARCH_INDEX_SCHEMA, total: 3, shards: [
    { source: 'kenney', path: 'search-index/kenney.json', count: 1 },
    { source: 'nga', path: 'search-index/nga.json', count: 2 },
  ] };
  const files = { 'api/search-index.json': manifest, 'api/search-index/kenney.json': kenney, 'api/search-index/nga.json': nga };
  const fetchImpl = async (url) => ({ json: async () => files[url] });
  const index = {}, loaded = new Map();
  const onlyNga = await loadNeededItems(fetchImpl, { manifestUrl: 'api/search-index.json', source: 'nga', loaded, index });
  const all = await loadNeededItems(fetchImpl, { manifestUrl: 'api/search-index.json', source: '', loaded, index });
  assert.deepEqual(
    search(onlyNga, { q: 'chair', sort: 'quality' }).results.map(i => i.id),
    search(all, { q: 'chair', source: 'nga', sort: 'quality' }).results.map(i => i.id),
  );
  assert.deepEqual(search(onlyNga, { q: 'chair' }).results.map(i => i.id), ['nga:2']);
  assert.deepEqual(search(all, { q: 'chair' }).results.map(i => i.id).sort(), ['kenney:k', 'nga:2']);
});
