// Slim browser search index, sharded by source so no published JSON exceeds the Pages size guard.
import { createHash } from 'node:crypto';
import { slimItem } from './slim.mjs';
import { MAX_PUBLISHED_JSON_BYTES } from './publish-limits.mjs';

export const SEARCH_INDEX_SCHEMA = 'free-asset-index/search-index-manifest/v1';

const bytesOf = value => Buffer.byteLength(JSON.stringify(value));

export function splitToFit(items, maxBytes) {
  const size = bytesOf(items);
  if (size <= maxBytes) return [items];
  if (items.length <= 1) throw new Error(`search-index shard item exceeds ${maxBytes} bytes (${size})`);
  const mid = Math.ceil(items.length / 2);
  return [...splitToFit(items.slice(0, mid), maxBytes), ...splitToFit(items.slice(mid), maxBytes)];
}

export function buildSearchIndex(items, { maxBytes = MAX_PUBLISHED_JSON_BYTES } = {}) {
  const slim = items.map(slimItem);
  const bySource = {};
  for (const i of slim) (bySource[i.source] ||= []).push(i);
  const files = {};
  const shards = [];
  for (const source of Object.keys(bySource).sort()) {
    const parts = splitToFit(bySource[source], maxBytes);
    const multi = parts.length > 1;
    parts.forEach((part, i) => {
      const path = multi ? `search-index/${source}-${i}.json` : `search-index/${source}.json`;
      const body = JSON.stringify(part);
      files[path] = part;
      shards.push({
        source,
        path,
        count: part.length,
        bytes: Buffer.byteLength(body),
        sha256: createHash('sha256').update(body).digest('hex'),
      });
    });
  }
  return {
    manifest: {
      schema: SEARCH_INDEX_SCHEMA,
      total: slim.length,
      note: 'Slim browser index, sharded by source under api/search-index/<source>.json. This file is a small manifest, not an item array.',
      shards,
    },
    files,
  };
}
