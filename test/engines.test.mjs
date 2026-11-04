import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineManifest, ENGINES } from '../src/engines.mjs';
import { readFileSync } from 'node:fs';
const b = { slug: 'space-kit', title: 'Space Kit', attribution: 'A\nB', items: [
  { id: 'kenney:space-kit', title: 'Space Kit', url: 'https://kenney.nl/assets/space-kit', license: 'CC0', licenseUrl: 'L', creator: 'Kenney', source: 'kenney', formats: ['GLB', 'FBX'], attribution: 'A' },
  { id: 'ambientcg:Metal 01', title: 'Metal 01', url: 'https://ambientcg.com/a/Metal01', license: 'CC-BY 4.0', licenseUrl: 'L', creator: 'X', source: 'ambientcg', formats: ['PNG'], attribution: 'B' }] };
test('engine manifests for godot, unity, threejs', () => {
  assert.deepEqual(ENGINES, ['godot', 'unity', 'threejs']);
  const g = engineManifest(b, 'godot');
  assert.equal(g.engine, 'godot'); assert.equal(g.assets.length, 2);
  assert.match(g.assets[0].targetPath, /^res:\/\/assets\/free\/kenney\/space-kit\/$/);
  assert.equal(g.assets[0].preferredFormat, 'GLB'); assert.equal(g.assets[1].targetPath, 'res://assets/free/ambientcg/metal-01/');
  assert.match(engineManifest(b, 'unity').assets[0].targetPath, /^Assets\/FreeAssets\/kenney\/space-kit\/$/);
  assert.equal(engineManifest(b, 'unity').assets[0].preferredFormat, 'FBX');
  const t = engineManifest(b, 'threejs');
  assert.equal(t.assets[0].loader, 'GLTFLoader'); assert.equal(t.assets[1].loader, 'TextureLoader');
  for (const e of ENGINES) { const m = engineManifest(b, e); assert.equal(m.attribution, 'A\nB'); for (const a of m.assets) assert.ok(a.sourceUrl && a.license && a.licenseUrl && a.attribution && a.download === 'manual'); }
  assert.throws(() => engineManifest(b, 'unreal'));
});
test('openapi.json and llms.txt exist and describe search + bundles', () => {
  const o = JSON.parse(readFileSync(new URL('../web/openapi.json', import.meta.url)));
  assert.equal(o.openapi.slice(0, 2), '3.');
  for (const p of ['/api/search', '/api/bundles', '/api/bundles/{slug}']) assert.ok(o.paths[p], p);
  const l = readFileSync(new URL('../web/llms.txt', import.meta.url), 'utf8');
  assert.match(l, /^# Free Asset Index/); assert.match(l, /search-index\.json/); assert.match(l, /license/i);
});
