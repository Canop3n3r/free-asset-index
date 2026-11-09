import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapMet, crawlMetMuseum } from '../src/sources/met-museum.mjs';

const base = (over = {}) => ({
  objectID: 436532,
  title: 'Self-Portrait with a Straw Hat',
  isPublicDomain: true,
  primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DT1502.jpg',
  primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1502.jpg',
  artistDisplayName: 'Vincent van Gogh',
  objectURL: 'https://www.metmuseum.org/art/collection/search/436532',
  objectName: 'Painting',
  classification: 'Paintings',
  department: 'European Paintings',
  culture: '',
  period: '',
  tags: [{ term: 'Men' }, { term: 'Portraits' }],
  ...over,
});

test('mapMet keeps Open Access PD items with primaryImage as CC0 JPG', () => {
  const it = mapMet(base());
  assert.equal(it.source, 'met-museum');
  assert.equal(it.sourceId, '436532');
  assert.equal(it.license, 'CC0');
  assert.equal(it.kind, '2d');
  assert.equal(it.style, 'realistic');
  assert.deepEqual(it.formats, ['JPG']);
  assert.equal(it.creator, 'Vincent van Gogh');
  assert.match(it.creatorUrl, /metmuseum\.org/);
  assert.equal(it.url, 'https://www.metmuseum.org/art/collection/search/436532');
  assert.equal(it.thumbnail, 'https://images.metmuseum.org/CRDImages/ep/web-large/DT1502.jpg');
  assert.equal(it.image, 'https://images.metmuseum.org/CRDImages/ep/original/DT1502.jpg');
  assert.equal(it.downloadUrl, it.image);
  assert.ok(it.tags.includes('met'));
  assert.ok(it.tags.includes('painting') || it.tags.includes('paintings'));
});

test('mapMet filters non-PD, missing image/title/id', () => {
  assert.equal(mapMet(base({ isPublicDomain: false })), null);
  assert.equal(mapMet(base({ isPublicDomain: true, primaryImage: '', primaryImageSmall: '' })), null);
  assert.equal(mapMet(base({ primaryImage: null, primaryImageSmall: null })), null);
  assert.equal(mapMet(base({ title: '' })), null);
  assert.equal(mapMet(base({ objectID: null })), null);
  assert.equal(mapMet(null), null);
});

test('mapMet falls back creator to The Metropolitan Museum of Art', () => {
  assert.equal(mapMet(base({ artistDisplayName: null })).creator, 'The Metropolitan Museum of Art');
  assert.equal(mapMet(base({ artistDisplayName: '' })).creator, 'The Metropolitan Museum of Art');
});

test('mapMet accepts primaryImageSmall-only', () => {
  const it = mapMet(base({ primaryImage: '', primaryImageSmall: 'https://images.metmuseum.org/x.jpg' }));
  assert.equal(it.thumbnail, 'https://images.metmuseum.org/x.jpg');
  assert.equal(it.image, 'https://images.metmuseum.org/x.jpg');
});

test('crawlMetMuseum only keeps PD+image and hits v1.1 search then objects', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('/v1.1/search')) {
      return {
        ok: true,
        json: async () => ({ total: 3, objectIDs: [1, 2, 3] }),
      };
    }
    const id = Number(url.split('/').pop());
    const rows = {
      1: base({ objectID: 1, title: 'Good' }),
      2: base({ objectID: 2, title: 'Bad', isPublicDomain: false }),
      3: base({ objectID: 3, title: 'NoImg', primaryImage: '', primaryImageSmall: '' }),
    };
    return { ok: true, json: async () => rows[id] };
  };
  const items = await crawlMetMuseum({
    sleep: async () => {}, fetchImpl, log: () => {},
    queries: ['armor'], pages: 1, maxItems: 10, concurrency: 2,
  });
  assert.deepEqual(items.map(i => i.sourceId), ['1']);
  assert.ok(items.every(i => i.license === 'CC0'));
  assert.ok(calls.some(u => u.includes('/v1.1/search') && u.includes('q=armor') && u.includes('isPublicDomain=true') && u.includes('hasImages=true')));
  assert.ok(calls.some(u => u.endsWith('/objects/1')));
  assert.ok(calls.every(u => /collectionapi\.metmuseum\.org/.test(u)));
});
