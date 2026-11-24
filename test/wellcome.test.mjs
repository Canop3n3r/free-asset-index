import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapWellcome, crawlWellcome } from '../src/sources/wellcome.mjs';

const mk = (id, lic, credit = 'Jane Doe') => ({ type: 'Image', id: 'img' + id, source: { id: 'wk' + id, title: 'Seven-headed dragon' }, locations: [{ url: `https://iiif.wellcomecollection.org/image/L00${id}/info.json`, credit, license: { id: lic } }] });

test('mapWellcome maps cc-by and cc0 with IIIF links', () => {
  const a = mapWellcome(mk(1, 'cc-by'), 'dragon');
  assert.equal(a.license, 'CC-BY 4.0'); assert.equal(a.creator, 'Jane Doe');
  assert.equal(a.url, 'https://wellcomecollection.org/works/wk1');
  assert.match(a.thumbnail, /L001\/full\/!400,400\/0\/default\.jpg$/);
  assert.equal(mapWellcome(mk(2, 'cc0')).license, 'CC0');
});
test('mapWellcome rejects other licenses and bad input', () => {
  assert.equal(mapWellcome(mk(3, 'pdm')), null);
  assert.equal(mapWellcome(null), null);
});
test('crawlWellcome dedupes and respects cap', async () => {
  const get = async () => ({ results: [mk(1, 'cc0'), mk(1, 'cc0'), mk(2, 'pdm'), mk(3, 'cc-by')] });
  const out = await crawlWellcome({ get, queries: ['a', 'b'], log: () => {} });
  assert.deepEqual(out.map(i => i.sourceId), ['img1', 'img3']);
  assert.equal((await crawlWellcome({ get, queries: ['a'], cap: 1, log: () => {} })).length, 1);
});
