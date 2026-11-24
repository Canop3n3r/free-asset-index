import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, mapNga, crawlNga } from '../src/sources/nga.mjs';

const U = '00007f61-4922-417b-8f27-893ea328206c';
const obj = { objectid: '17387', title: 'Jug', attribution: 'Unknown', classification: 'Decorative Art', subclassification: '', medium: 'stoneware' };
const img = { iiifurl: 'https://api.nga.gov/iiif/' + U, openaccess: '1', viewtype: 'primary', depictstmsobjectid: '17387' };

test('parseCsv handles quotes, commas and newlines', () => {
  const r = parseCsv('a,b\n1,"x,""y""\nz"\n');
  assert.deepEqual(r, [{ a: '1', b: 'x,"y"\nz' }]);
});
test('mapNga yields CC0 JPG with IIIF previews', () => {
  const it = mapNga(obj, img);
  assert.equal(it.license, 'CC0');
  assert.equal(it.source, 'nga');
  assert.match(it.thumbnail, /!400,400/);
  assert.match(it.url, /nga\.gov/);
  assert.equal(it.creator, 'Unknown');
});
test('mapNga rejects non-openaccess and bad input', () => {
  assert.equal(mapNga(obj, { ...img, openaccess: '0' }), null);
  assert.equal(mapNga({ ...obj, title: '' }, img), null);
  assert.equal(mapNga(null, img), null);
});
test('crawlNga filters by class and open access', async () => {
  const csv = {
    'published_images.csv': 'uuid,iiifurl,viewtype,openaccess,depictstmsobjectid\nx,https://api.nga.gov/iiif/' + U + ',primary,1,1\ny,https://api.nga.gov/iiif/' + U + ',primary,0,2\n',
    'objects.csv': 'objectid,title,attribution,classification,subclassification,medium\n1,A,Bob,Sculpture,,bronze\n2,B,Bob,Sculpture,,bronze\n3,C,Bob,Print,,paper\n',
  };
  const get = async u => csv[u.split('/').pop()];
  const out = await crawlNga({ get, log: () => {} });
  assert.equal(out.length, 1);
  assert.equal(out[0].sourceId, '1');
});
