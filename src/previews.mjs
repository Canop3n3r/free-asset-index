// Best official preview per item (hotlinked from the source's own site/CDN; UI falls back on error).
export function previewFor(i) {
  if (i.image) return i.image;
  const t = i.thumbnail; if (!t) return null;
  if (i.source === 'polyhaven') return t.replace(/width=\d+/, 'width=1024').replace(/height=\d+/, 'height=1024');
  if (i.source === 'quaternius') return t.replace('/images/thumbnails/', '/images/fullres/');
  if (i.source === 'opengameart') return t.replace(/\/styles\/[^/]+\/public\//, '/');
  return t;
}
