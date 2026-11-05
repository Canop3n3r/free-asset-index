import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapArtic, crawlArtic } from '../src/sources/artic.mjs';

const base = (over = {}) => ({
  id: 116363,
  title: 'Field Armor for Man',
  is_public_domain: true,
  image_id: '0b992dcc-d94b-d47d-f1e3-88c1ceb024bd',
  artist_title: 'Jacob Halder',
  artwork_type_title: 'Armor',
  department_title: 'Applied Arts of Europe',
  date_display: '1588–90',
  ...over,
});

test('mapArtic keeps public-domain items with image_id as CC0 JPG', () => {
  const it = mapArtic(base());
  assert.equal(it.source, 'artic');
  assert.equal(it.sourceId, '116363');
  assert.equal(it.license, 'CC0');
  assert.equal(it.kind, '2d');
  assert.equal(it.style, 'realistic');
  assert.deepEqual(it.formats, ['JPG']);
  assert.equal(it.creator, 'Jacob Halder');
  assert.equal(it.creatorUrl, 'https://www.artic.edu/open-access');
  assert.equal(it.url, 'https://www.artic.edu/artworks/116363');
  assert.ok(it.thumbnail.includes('/iiif/2/0b992dcc-d94b-d47d-f1e3-88c1ceb024bd/full/400,'));
  assert.ok(it.image.includes('/full/843,'));
  assert.equal(it.downloadUrl, it.image);
  assert.ok(it.tags.includes('artic'));
  assert.ok(it.tags.includes('armor'));
});

test('mapArtic filters non-PD, missing image/title/id', () => {
  assert.equal(mapArtic(base({ is_public_domain: false })), null);
  assert.equal(mapArtic(base({ is_public_domain: true, image_id: null })), null);
  assert.equal(mapArtic(base({ image_id: '' })), null);
  assert.equal(mapArtic(base({ title: '' })), null);
  assert.equal(mapArtic(base({ id: null })), null);
  assert.equal(mapArtic(null), null);
});

test('mapArtic falls back creator to Art Institute of Chicago', () => {
  assert.equal(mapArtic(base({ artist_title: null })).creator, 'Art Institute of Chicago');
  assert.equal(mapArtic(base({ artist_title: '' })).creator, 'Art Institute of Chicago');
});

test('crawlArtic only keeps PD+image and uses User-Agent POST', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      json: async () => ({
        pagination: { total_pages: 1 },
        data: [
          base({ id: 1, title: 'Good' }),
          base({ id: 2, title: 'Bad', is_public_domain: false }),
          base({ id: 3, title: 'NoImg', image_id: null }),
        ],
      }),
    };
  };
  const items = await crawlArtic({
    sleep: async () => {}, fetchImpl, log: () => {}, queries: ['armor'], pages: 1,
  });
  assert.deepEqual(items.map(i => i.sourceId), ['1']);
  assert.ok(items.every(i => i.license === 'CC0'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.artic.edu/api/v1/artworks/search');
  assert.equal(calls[0].opts.method, 'POST');
  assert.match(calls[0].opts.headers['User-Agent'], /free-asset-index/);
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.q, 'armor');
  assert.ok(body.query.bool.must.some(m => m.term?.is_public_domain === true));
  assert.ok(body.query.bool.must.some(m => m.exists?.field === 'image_id'));
});
