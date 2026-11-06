import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pageSlug, legacyRenderSlug, compactTitle, previewUrls, mapCgBookcase, crawlCgBookcase,
} from '../src/sources/cgbookcase.mjs';
import { normalizeItem } from '../src/lib.mjs';

const sampleNew = {
  title: 'Birch Bark 01', tags: ['bark', 'wood'], releasedate: '2026-10-23', resolution: 6,
  files: ['AO', 'Base_Color', 'Height', 'Normal', 'Roughness'], doublesided: false,
  colors: ['brown', 'white'], categories: ['Bark'], oneType: 'pbr-scanned', id: 585,
  queries: ['bark', 'wood', 'birch', '01'],
};

const sampleOld = {
  title: 'Small Tiles 02', tags: ['tiles'], releasedate: '2020-01-01', resolution: 4,
  files: ['AO', 'Base_Color', 'Height', 'Normal', 'Roughness'], doublesided: false,
  colors: ['grey'], categories: ['Tiles'], oneType: 'pbr-procedural', id: 400,
  queries: ['tiles', '02'],
};

test('slug helpers match site JS', () => {
  assert.equal(pageSlug('Birch Bark 01'), 'birch-bark-01');
  assert.equal(compactTitle('Birch Bark 01'), 'BirchBark01');
  assert.equal(legacyRenderSlug('Small Tiles 02'), 'Small_tiles_02');
  assert.equal(legacyRenderSlug('Brick Wall 29'), 'Brick_wall_29');
});

test('preview URLs use new CDN after id 538 and legacy CDN before', () => {
  const n = previewUrls(sampleNew);
  assert.match(n.thumbnail, /cgbookcase\.b-cdn\.net\/textures\/renders\/2024_b\/BirchBark01_render_default\.jpg\?width=480/);
  assert.match(n.image, /width=720/);
  const o = previewUrls(sampleOld);
  assert.match(o.image, /cdn\.cgbookcase\.cloud\/file\/cgbookcase\/textures\/renders\/bg_white\/480w\/Small_tiles_02_default\.jpg/);
});

test('maps CC0 PBR texture with creator, page URL, formats and resolution', () => {
  const i = normalizeItem(mapCgBookcase(sampleNew));
  assert.equal(i.source, 'cgbookcase');
  assert.equal(i.id, 'cgbookcase:585');
  assert.equal(i.license, 'CC0');
  assert.equal(i.creator, 'cgbookcase');
  assert.equal(i.url, 'https://www.cgbookcase.com/textures/birch-bark-01');
  assert.equal(i.kind, 'texture');
  assert.equal(i.textureRes, 6144);
  assert.ok(i.formats.includes('PNG'));
  assert.ok(i.tags.includes('bark'));
  assert.ok(i.image.includes('BirchBark01'));
  assert.equal(i.downloadUrl, null);
});

test('rejects incomplete rows', () => {
  assert.equal(mapCgBookcase(null), null);
  assert.equal(mapCgBookcase({ title: 'X' }), null);
  assert.equal(mapCgBookcase({ id: 1 }), null);
});

test('crawlCgBookcase maps API list and respects limit', async () => {
  const rows = [sampleNew, sampleOld, { ...sampleNew, id: 585 }]; // duplicate id ignored
  const get = async () => rows;
  const out = await crawlCgBookcase({ get, sleep: async () => {}, limit: 10 });
  assert.equal(out.length, 2);
  assert.equal(out[0].sourceId, '585');
  assert.equal(out[1].sourceId, '400');
  const limited = await crawlCgBookcase({ get, sleep: async () => {}, limit: 1 });
  assert.equal(limited.length, 1);
});
