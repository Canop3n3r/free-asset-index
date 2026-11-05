import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapSmithsonianImage, crawlSmithsonianImages } from '../src/sources/smithsonian-images.mjs';
const FAKE_KEY = 'fake-test-key-123';
const row = (id, access = 'CC0', mediaAccess = access) => ({
  title: `Obj ${id}`,
  content: {
    descriptiveNonRepeating: { record_ID: id, data_source: 'NMAH', metadata_usage: { access },
      online_media: { media: [{ type: 'Images', usage: { access: mediaAccess }, content: `https://ids.si.edu/ids/deliveryService?id=${id}` }] } },
    indexedStructured: {},
  },
});
test('only CC0 items survive the filter', () => {
  assert.equal(mapSmithsonianImage(row('a')).license, 'CC0');
  assert.equal(mapSmithsonianImage(row('b', 'Usage conditions apply')), null);
  assert.equal(mapSmithsonianImage(row('c', 'CC0', 'Usage conditions apply')), null);
});
test('crawl keeps only CC0 and sends key only in X-Api-Key header', async () => {
  process.env.DATA_GOV_API_KEY = FAKE_KEY;
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, json: async () => ({ response: { rowCount: 3, rows: [row('ok1'), row('bad1', 'Usage conditions apply'), row('bad2', 'CC0', 'restricted')] } }) };
  };
  const items = await crawlSmithsonianImages({ sleep: async () => {}, key: process.env.DATA_GOV_API_KEY, fetchImpl, log: () => {}, queries: ['x'], pages: 1 });
  assert.deepEqual(items.map(i => i.sourceId), ['ok1']);
  assert.ok(items.every(i => i.license === 'CC0'));
  assert.equal(calls.length, 1);
  const { url, opts } = calls[0];
  assert.equal(opts.headers['X-Api-Key'], FAKE_KEY);
  assert.ok(!url.includes(FAKE_KEY));
  assert.ok(!/api_key|apikey/i.test(new URL(url).search));
  delete process.env.DATA_GOV_API_KEY;
});
