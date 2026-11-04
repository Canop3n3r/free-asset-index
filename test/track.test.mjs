import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrackRequest } from '../web/track.js';
import { readFileSync } from 'node:fs';
test('no endpoint -> no request (static site works offline)', () => assert.equal(buildTrackRequest({}, { type: 'view', creator: 'a' }), null));
test('supabase RPC shape with apikey header', () => {
  const r = buildTrackRequest({ trackEndpoint: 'https://x/rpc/track_event', trackKey: 'k' }, { type: 'click', creator: 'a', item: 'i' });
  assert.equal(r.init.headers.apikey, 'k'); assert.deepEqual(JSON.parse(r.init.body), { p_type: 'click', p_creator: 'a', p_item: 'i' });
});
test('plain server shape', () => assert.deepEqual(JSON.parse(buildTrackRequest({ trackEndpoint: '/api/track' }, { type: 'view', creator: 'a' }).init.body), { type: 'view', creator: 'a' }));
test('shipped config never contains a secret/service key', () => {
  const c = JSON.parse(readFileSync(new URL('../web/config.json', import.meta.url)));
  assert.ok(!c.trackKey || c.trackKey.startsWith('sb_publishable_'));
});
