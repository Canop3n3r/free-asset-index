import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { makeServer } from '../server.mjs';
import { normalizeItem } from '../src/lib.mjs';

test('server: /api/search returns filtered results with license; /api/track counts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fai-'));
  const items = [normalizeItem({ source: 'kenney', sourceId: 'x', title: 'Nature Kit', creator: 'Kenney', license: 'CC0', url: 'https://kenney.nl/assets/nature-kit', formats: ['GLB'] })];
  await writeFile(join(dir, 'items.json'), JSON.stringify(items));
  const srv = await makeServer({ itemsPath: join(dir, 'items.json') });
  await new Promise(r => srv.listen(0, r)); const base = `http://127.0.0.1:${srv.address().port}`;
  const r = await (await fetch(`${base}/api/search?q=nature&format=glb&license=CC0`)).json();
  assert.equal(r.total, 1); assert.equal(r.results[0].license, 'CC0'); assert.ok(r.results[0].licenseUrl);
  assert.equal((await (await fetch(`${base}/api/search?license=CC-BY`)).json()).total, 0);
  assert.equal((await fetch(`${base}/api/track`, { method: 'POST', body: JSON.stringify({ type: 'click', creator: 'kenney' }) })).status, 204);
  assert.equal((await fetch(`${base}/api/track`, { method: 'POST', body: '{"type":"evil"}' })).status, 400);
  assert.deepEqual(await (await fetch(`${base}/api/stats`)).json(), { kenney: { views: 0, clicks: 1 } });
  assert.equal((await fetch(`${base}/../../etc/passwd`)).status, 404);
  srv.close();
});
