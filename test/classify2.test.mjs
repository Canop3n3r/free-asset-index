import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/classify.mjs';
import { parseQuaterniusFormats } from '../src/sources/quaternius.mjs';
import { normalizeItem } from '../src/lib.mjs';
const mk = o => normalizeItem({ source: 'ambientcg', creator: 'C', license: 'CC0', url: 'https://x.y/' + o.sourceId, sourceId: 'x', ...o });
const c = o => classify(mk(o));

test('water category for water/ocean materials and models', () => {
  assert.ok(c({ title: 'Ocean Water 002', kind: 'texture' }).categories.includes('water'));
  assert.ok(c({ title: 'Lake surface', tags: ['water', 'ripples'], kind: 'texture' }).categories.includes('water'));
  assert.ok(!c({ title: 'Watermelon', kind: '3d' }).categories.includes('water'));
});
test('texture map types surfaced', () => {
  assert.deepEqual(c({ title: 'Water normal map', kind: 'texture', tags: ['normal'] }).maps.includes('normal'), true);
  assert.deepEqual(c({ title: 'Bark 016', kind: 'texture', maps: ['color', 'roughness', 'normal'] }).maps.sort(), ['color', 'normal', 'roughness']);
});
test('launch pad / spaceport / tarmac category; pad word boundary', () => {
  for (const t of ['Launch Pad', 'Spaceport Kit', 'Airport Tarmac', 'Landing pad 01', 'Helipad', 'Concrete launchpad']) assert.ok(c({ title: t }).categories.includes('launchpads'), t);
  for (const t of ['Gamepad Icons', 'Notepad', 'Keypad', 'iPad stand']) assert.ok(!c({ title: t }).categories.includes('launchpads'), t);
});
test('HDRIs stay out of non-hdri categories', () => {
  const h = c({ title: 'Forest Lake Ocean Sunset', kind: 'hdri', tags: ['nature', 'water', 'outdoor'] });
  assert.deepEqual(h.categories, ['hdris']);
});
test('audio subcategories', () => {
  assert.deepEqual(c({ title: 'Footsteps on gravel', kind: 'audio', tags: ['footsteps'] }).audio, 'sfx');
  assert.deepEqual(c({ title: 'Forest ambience birds', kind: 'audio', tags: ['ambience'] }).audio, 'ambience');
  assert.deepEqual(c({ title: 'Chiptune loop', kind: 'audio', tags: ['music', 'loop'] }).audio, 'music');
  assert.ok(c({ title: 'Ocean waves', kind: 'audio', tags: ['ambience'] }).categories.includes('audio'));
  assert.equal(c({ title: 'Chair', kind: '3d' }).audio, undefined);
});
test('Quaternius formats from tag divs and meta', () => {
  assert.deepEqual(parseQuaterniusFormats('<div class="text-right tags">FBX</div>\n<div class="text-right tags">OBJ</div><div class="text-right tags">glTF</div>'), ['FBX', 'OBJ', 'GLTF']);
  assert.deepEqual(parseQuaterniusFormats('<meta name="description" content="All in .FBX, .OBJ and .Blend formats"/>'), ['FBX', 'OBJ', 'BLEND']);
  assert.deepEqual(parseQuaterniusFormats('<meta name="description" content="nothing"/>'), []);
});
test('audio items only get the audio category (no space/ui/pixel leakage)', () => {
  const a = c({ title: 'Rocket launch 8-bit UI click', kind: 'audio', tags: ['space', 'button'] });
  assert.deepEqual(a.categories, ['audio']); assert.deepEqual(a.styles, []); assert.equal(a.audio, 'sfx');
});
