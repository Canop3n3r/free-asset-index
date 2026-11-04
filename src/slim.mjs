// Compact record for the browser's search index (keeps every license/credit field).
export const slimItem = i => ({ id: i.id, source: i.source, title: i.title, creator: i.creator, creatorSlug: i.creatorSlug, creatorUrl: i.creatorUrl,
  license: i.license, licenseUrl: i.licenseUrl, url: i.url, thumbnail: i.thumbnail, image: i.image, kind: i.kind, style: i.style, styles: i.styles,
  categories: i.categories, formats: i.formats, tags: (i.tags || []).slice(0, 8), quality: i.quality, alsoAt: i.alsoAt,
  downloadUrl: i.downloadUrl, fileSize: i.fileSize, triangles: i.triangles, textureRes: i.textureRes, maps: i.maps, audio: i.audio, preview: i.preview, duration: i.duration });
