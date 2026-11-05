import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapGameIcon, crawlGameIcons, parseSvgPath, artistLicense, humanizeSlug,
  CC0_ARTISTS, iconPageUrl, iconPreviewUrl,
} from '../src/sources/game-icons.mjs';

test('humanizeSlug turns kebab names into title case', () => {
  assert.equal(humanizeSlug('crossed-swords'), 'Crossed Swords');
  assert.equal(humanizeSlug('viscious-speed'), 'Viscious Speed');
  assert.equal(humanizeSlug('lorc'), 'Lorc');
});

test('artistLicense is CC0 only for marked artists, else CC-BY 3.0', () => {
  assert.equal(artistLicense('viscious-speed'), 'CC0');
  assert.equal(artistLicense('zeromancer'), 'CC0');
  assert.equal(artistLicense('lorc'), 'CC-BY 3.0');
  assert.equal(artistLicense('delapouite'), 'CC-BY 3.0');
  assert.ok(CC0_ARTISTS.has('viscious-speed'));
});

test('parseSvgPath keeps artist/name.svg and skips noise', () => {
  assert.deepEqual(parseSvgPath('lorc/crossed-swords.svg'), { artist: 'lorc', name: 'crossed-swords' });
  assert.equal(parseSvgPath('readme.md'), null);
  assert.equal(parseSvgPath('orphan.svg'), null); // no artist folder
  assert.equal(parseSvgPath('a/b/c.svg'), null); // too deep
  assert.equal(parseSvgPath(null), null);
});

test('mapGameIcon builds CC-BY item with game-icons.net URLs', () => {
  const it = mapGameIcon({ path: 'lorc/crossed-swords.svg' });
  assert.equal(it.source, 'game-icons');
  assert.equal(it.sourceId, 'lorc/crossed-swords');
  assert.equal(it.title, 'Crossed Swords');
  assert.equal(it.creator, 'Lorc');
  assert.equal(it.license, 'CC-BY 3.0');
  assert.equal(it.kind, '2d');
  assert.equal(it.style, null);
  assert.deepEqual(it.formats, ['SVG']);
  assert.equal(it.url, iconPageUrl('lorc', 'crossed-swords'));
  assert.equal(it.thumbnail, iconPreviewUrl('lorc', 'crossed-swords'));
  assert.equal(it.image, it.thumbnail);
  assert.equal(it.downloadUrl, it.thumbnail);
  assert.match(it.url, /^https:\/\/game-icons\.net\/1x1\/lorc\/crossed-swords\.html$/);
  assert.match(it.thumbnail, /^https:\/\/game-icons\.net\/icons\/ffffff\/000000\/1x1\/lorc\/crossed-swords\.svg$/);
  assert.ok(it.tags.includes('icon'));
  assert.ok(it.tags.includes('game-icons'));
  assert.ok(it.tags.includes('crossed'));
  assert.ok(it.tags.includes('swords'));
});

test('mapGameIcon uses CC0 for viscious-speed and zeromancer', () => {
  assert.equal(mapGameIcon({ path: 'viscious-speed/abstract-001.svg' }).license, 'CC0');
  assert.equal(mapGameIcon({ path: 'zeromancer/ripple.svg' }).license, 'CC0');
  assert.equal(mapGameIcon({ path: 'zeromancer/ripple.svg' }).creator, 'Zeromancer');
});

test('mapGameIcon returns null for bad rows', () => {
  assert.equal(mapGameIcon(null), null);
  assert.equal(mapGameIcon({ path: 'license.txt' }), null);
  assert.equal(mapGameIcon({ path: 'x.svg' }), null);
  assert.equal(mapGameIcon({}), null);
});

test('crawlGameIcons uses User-Agent and maps mocked tree', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      json: async () => ({
        tree: [
          { path: 'lorc/crossed-swords.svg', type: 'blob' },
          { path: 'viscious-speed/abstract-001.svg', type: 'blob' },
          { path: 'README.md', type: 'blob' },
          { path: 'orphan.svg', type: 'blob' },
          { path: 'lorc', type: 'tree' },
          { path: 'lorc/crossed-swords.svg', type: 'blob' }, // dup
        ],
      }),
    };
  };
  const items = await crawlGameIcons({ sleep: async () => {}, fetchImpl, log: () => {} });
  assert.equal(items.length, 2);
  assert.deepEqual(items.map(i => i.sourceId).sort(), ['lorc/crossed-swords', 'viscious-speed/abstract-001'].sort());
  assert.equal(items.find(i => i.sourceId.startsWith('lorc')).license, 'CC-BY 3.0');
  assert.equal(items.find(i => i.sourceId.startsWith('viscious')).license, 'CC0');
  assert.equal(calls.length, 1);
  assert.match(calls[0].opts.headers['User-Agent'], /free-asset-index/);
  assert.match(calls[0].url, /api\.github\.com\/repos\/game-icons\/icons\/git\/trees\/master/);
});

test('crawlGameIcons respects maxItems', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      tree: [
        { path: 'lorc/a.svg', type: 'blob' },
        { path: 'lorc/b.svg', type: 'blob' },
        { path: 'lorc/c.svg', type: 'blob' },
      ],
    }),
  });
  const items = await crawlGameIcons({ sleep: async () => {}, fetchImpl, log: () => {}, maxItems: 2 });
  assert.equal(items.length, 2);
});
