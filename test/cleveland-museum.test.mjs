import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapCleveland, crawlCleveland } from '../src/sources/cleveland-museum.mjs';

const base = (over = {}) => ({
  id: 141444,
  title: 'Armor for Man and Horse',
  share_license_status: 'CC0',
  url: 'https://clevelandart.org/art/1964.88',
  type: 'Arms and Armor',
  department: 'Medieval Art',
  technique: 'steel',
  creators: [{ description: 'North Italy (16th century)' }],
  images: {
    web: { url: 'https://openaccess-cdn.clevelandart.org/1964.88/1964.88_web.jpg' },
    print: { url: 'https://openaccess-cdn.clevelandart.org/1964.88/1964.88_print.jpg' },
    full: { url: 'https://openaccess-cdn.clevelandart.org/1964.88/1964.88_full.tif' },
  },
  ...over,
});

test('mapCleveland keeps CC0 items with https web/print images', () => {
  const it = mapCleveland(base());
  assert.equal(it.source, 'cleveland-museum');
  assert.equal(it.sourceId, '141444');
  assert.equal(it.license, 'CC0');
  assert.equal(it.kind, '2d');
  assert.equal(it.style, 'realistic');
  assert.deepEqual(it.formats, ['JPG']);
  assert.ok(it.thumbnail.startsWith('https://'));
  assert.ok(it.image.startsWith('https://'));
  assert.ok(it.tags.includes('cleveland'));
  assert.equal(it.creatorUrl, 'https://www.clevelandart.org/open-access');
  assert.equal(it.downloadUrl, 'https://openaccess-cdn.clevelandart.org/1964.88/1964.88_print.jpg');
});

test('mapCleveland filters non-CC0 and missing images/title/id', () => {
  assert.equal(mapCleveland(base({ share_license_status: 'Copyrighted' })), null);
  assert.equal(mapCleveland(base({ images: { full: { url: 'https://x/full.tif' } } })), null);
  assert.equal(mapCleveland(base({ images: { web: { url: 'http://insecure/web.jpg' } } })), null);
  assert.equal(mapCleveland(base({ title: '' })), null);
  assert.equal(mapCleveland(base({ id: null })), null);
  assert.equal(mapCleveland(null), null);
});

test('mapCleveland falls back creator and strips bio parenthetical', () => {
  assert.equal(mapCleveland(base({ creators: [] })).creator, 'Cleveland Museum of Art');
  assert.equal(
    mapCleveland(base({ creators: [{ description: 'Henri Rousseau (French, 1844–1910)' }] })).creator,
    'Henri Rousseau',
  );
});

test('crawlCleveland only keeps CC0 and uses User-Agent', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      json: async () => ({
        info: { total: 2 },
        data: [
          base({ id: 1, title: 'Good' }),
          base({ id: 2, title: 'Bad', share_license_status: 'Restricted' }),
          base({ id: 3, title: 'NoImg', images: {} }),
        ],
      }),
    };
  };
  const items = await crawlCleveland({
    sleep: async () => {}, fetchImpl, log: () => {}, queries: ['armor'], pages: 1,
  });
  assert.deepEqual(items.map(i => i.sourceId), ['1']);
  assert.ok(items.every(i => i.license === 'CC0'));
  assert.equal(calls.length, 1);
  assert.match(calls[0].opts.headers['User-Agent'], /free-asset-index/);
  assert.match(calls[0].url, /cc0=1/);
  assert.match(calls[0].url, /has_image=1/);
});
