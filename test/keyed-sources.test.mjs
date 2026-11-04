import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFreesound, freesoundLicense, crawlFreesound } from '../src/sources/freesound.mjs';
import { mapSmithsonian, crawlSmithsonian } from '../src/sources/smithsonian.mjs';
import { normalizeItem } from '../src/lib.mjs';
import { classify } from '../src/classify.mjs';

test('freesound license mapping excludes NC and Sampling+', () => {
  assert.equal(freesoundLicense('http://creativecommons.org/publicdomain/zero/1.0/'), 'CC0');
  assert.equal(freesoundLicense('https://creativecommons.org/licenses/by/4.0/'), 'CC-BY 4.0');
  assert.equal(freesoundLicense('http://creativecommons.org/licenses/by/3.0/'), 'CC-BY 3.0');
  assert.equal(freesoundLicense('http://creativecommons.org/licenses/by-nc/4.0/'), null);
  assert.equal(freesoundLicense('http://creativecommons.org/licenses/sampling+/1.0/'), null);
});
const fs1 = { id: 1, name: 'Rocket launch', username: 'bob', license: 'https://creativecommons.org/licenses/by/4.0/', url: 'https://freesound.org/people/bob/sounds/1/', type: 'wav', duration: 3.2, tags: ['rocket'],
  previews: { 'preview-hq-mp3': 'https://cdn.freesound.org/previews/0/1_2-hq.mp3' }, images: { waveform_m: 'https://cdn.freesound.org/displays/0/1_2_wave_M.png' } };
test('freesound item: attribution, preview download, audio category', () => {
  const i = normalizeItem(mapFreesound(fs1, 'sfx'));
  assert.equal(i.license, 'CC-BY 4.0'); assert.match(i.attribution, /by bob/);
  assert.equal(i.downloadUrl, 'https://cdn.freesound.org/previews/0/1_2-hq.mp3'); assert.equal(i.preview, i.downloadUrl); assert.equal(i.duration, 3.2);
  const c = classify(i); assert.ok(c.categories.includes('audio')); assert.equal(c.audio, 'sfx');
  assert.equal(mapFreesound({ ...fs1, license: 'http://creativecommons.org/licenses/by-nc/3.0/' }, 'sfx'), null);
});
test('keyed crawlers send key only in headers, never in URLs or output', async () => {
  const KEY = 'TESTKEY123'; const seen = [];
  const fetchImpl = async (url, init) => { seen.push({ url, init }); return { ok: true, json: async () => (url.includes('freesound') ? { results: [fs1], next: null } : { response: { rowCount: 1, rows: [] } }) }; };
  const out = await crawlFreesound({ sleep: async () => {}, key: KEY, fetchImpl, log: () => {} });
  await crawlSmithsonian({ sleep: async () => {}, key: KEY, fetchImpl, log: () => {} });
  for (const s of seen) { assert.ok(!s.url.includes(KEY)); assert.ok(JSON.stringify(s.init.headers).includes(KEY)); }
  assert.ok(!JSON.stringify(out).includes(KEY));
});
const row = { title: 'Mantis shrimp', content: { descriptiveNonRepeating: { data_source: 'NMNH', online_media: { media: [
  { id: '3d_package:abc', type: '3d_voyager', usage: { access: 'CC0' }, content: 'https://3d-api.si.edu/voyager/3d_package:abc', thumbnail: 'https://3d-api.si.edu/t.jpg', resources: [
    { url: 'https://3d-api.si.edu/x/m-100k-2048_std.glb', filename: 'm-100k-2048_std.glb', category: 'Low Resolution', title: 'Low glb', attributes: [{ MODEL_FILE_TYPE: 'glb' }, { FILE_SIZE: 2961248 }] },
    { url: 'https://3d-api.si.edu/x/m-100k-2048_std_draco.glb', filename: 'm-100k-2048_std_draco.glb', category: 'Low Resolution', attributes: [{ MODEL_FILE_TYPE: 'glb' }] }] },
  { id: '3d_package:nope', type: '3d_voyager', usage: { access: 'Usage conditions apply' } }] } }, indexedStructured: { topic: ['Invertebrate Zoology'] } } };
test('smithsonian: CC0 only, GLB download, size, triangles, texture res', () => {
  const items = mapSmithsonian(row).map(normalizeItem);
  assert.equal(items.length, 1);
  const i = items[0];
  assert.equal(i.license, 'CC0'); assert.equal(i.url, 'https://3d-api.si.edu/voyager/3d_package:abc');
  assert.equal(i.downloadUrl, 'https://3d-api.si.edu/x/m-100k-2048_std.glb'); assert.equal(i.fileSize, 2961248);
  assert.equal(i.triangles, 100000); assert.equal(i.textureRes, 2048); assert.ok(i.formats.includes('GLB'));
});
