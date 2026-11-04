import { search, creatorStats, attribution } from './lib.mjs';
import { track, localStats, globalStats } from './track.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FIELDS = ['q', 'category', 'kind', 'style', 'format', 'license', 'source', 'maxTriangles', 'maxFileSize', 'maxTextureRes', 'sort'];
const mb = b => (b == null ? '' : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);
const PAGE = 60;
const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#0c0e11"/><path d="M2 7l2-3 2 2 1-1 1 2z" fill="#334"/></svg>');
let items = [], byId = new Map(), shown = PAGE, lastResults = [];

// Image with fallbacks: large preview -> thumbnail -> placeholder (never a broken image).
const img = (i, big) => {
  const chain = [big ? i.image : i.thumbnail || i.image, big ? i.thumbnail : i.image].filter(Boolean);
  return `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${esc(i.title)} preview" src="${esc(chain[0] || PLACEHOLDER)}" data-fb="${esc(chain.slice(1).join('|'))}">`;
};
document.addEventListener('error', e => {
  const t = e.target; if (t.tagName !== 'IMG') return;
  const rest = (t.dataset.fb || '').split('|').filter(Boolean);
  t.dataset.fb = rest.slice(1).join('|'); t.src = rest[0] || PLACEHOLDER;
}, true);

const card = i => `<article class="card" data-qv="${esc(i.id)}" tabindex="0">
  <div class="thumb">${img(i, false)}<span class="lic-badge ${i.license === 'CC0' ? 'cc0' : 'ccby'}">${esc(i.license)}</span></div>
  <h3>${esc(i.title)}</h3><p class="meta">${esc(i.creator)} · ${esc(i.source)}</p></article>`;

function quickView(i) {
  const d = $('#qv');
  d.innerHTML = `<button class="close" aria-label="Close">×</button><div class="qv">
  <div class="qv-img">${img(i, true)}</div><div class="qv-info"><h2>${esc(i.title)}</h2>
  <p>by <a href="#/creator/${esc(i.creatorSlug)}">${esc(i.creator)}</a> on ${esc(i.source)}</p>
  <p><a class="lic" href="${esc(i.licenseUrl)}" target="_blank" rel="noopener">${esc(i.license)}</a> · ${esc(i.kind || '')} ${(i.formats || []).map(f => `<span class="fmt">${esc(f)}</span>`).join('')}</p>
  <p class="meta">${esc([...(i.categories || []), ...(i.styles || []), i.audio].filter(Boolean).join(' · '))}</p>
  <p class="meta">${[i.triangles != null && `${i.triangles.toLocaleString()} tris`, i.textureRes && `${i.textureRes >= 1024 ? i.textureRes / 1024 + 'K' : i.textureRes + 'px'} textures`, i.fileSize != null && `download ${mb(i.fileSize)}`, i.duration && `${i.duration.toFixed(1)} s`, i.maps?.length && `maps: ${i.maps.join(', ')}`].filter(Boolean).map(esc).join(' · ')}</p>
  ${i.preview ? `<audio controls preload="none" src="${esc(i.preview)}"></audio>` : ''}
  ${i.downloadUrl ? `<p class="meta"><a href="${esc(i.downloadUrl)}" data-out="${esc(i.creatorSlug)}" data-id="${esc(i.id)}" rel="noopener">Direct download${i.fileSize ? ` (${mb(i.fileSize)})` : ''} ↓</a>, served by ${esc(i.source)}</p>` : ''}
  <a class="btn" href="${esc(i.url)}" target="_blank" rel="noopener" data-out="${esc(i.creatorSlug)}" data-id="${esc(i.id)}">Get it on ${esc(i.source)} ↗</a>
  ${(i.alsoAt || []).map(u => `<p class="meta">Also at <a href="${esc(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname)}</a></p>`).join('')}
  <label class="meta">Credit line</label><textarea readonly>${esc(attribution(i))}</textarea><button data-copy>Copy credit</button></div></div>`;
  d.showModal();
}

function readFilters() { return Object.fromEntries(FIELDS.map(f => [f, $('#' + f).value])); }
function writeUrl(p) {
  const qs = new URLSearchParams(Object.entries(p).filter(([k, v]) => v && !(k === 'sort' && v === 'quality')));
  history.replaceState(null, '', (qs.toString() ? '?' + qs : location.pathname) + location.hash);
}

async function render() {
  const h = location.hash;
  if (h === '#/creators') {
    $('#filters').hidden = true;
    const g = await globalStats(); const st = g || localStats();
    $('#main').innerHTML = `<h2>Creators</h2><p class="note">${g ? 'Views/clicks across all visitors (anonymous, no personal data).' : 'Global stats unavailable; showing counts from this browser only.'}</p><div class="table-wrap"><table><tr><th>Creator</th><th>Assets</th><th>Sources</th><th>Views</th><th>Clicks</th></tr>${creatorStats(items).map(c => `<tr><td><a href="#/creator/${esc(c.slug)}">${esc(c.name)}</a></td><td>${c.count}</td><td>${esc(c.sources.join(', '))}</td><td>${st[c.slug]?.views || 0}</td><td>${st[c.slug]?.clicks || 0}</td></tr>`).join('')}</table></div>`;
    return;
  }
  const m = h.match(/^#\/creator\/(.+)$/);
  $('#filters').hidden = !!m;
  let p = readFilters(), head = '';
  if (m) {
    p = { creator: decodeURIComponent(m[1]), sort: 'quality' };
    const c = creatorStats(items.filter(i => i.creatorSlug === p.creator))[0];
    if (c) { head = `<p><a href="./">← Search</a></p><h2>${esc(c.name)}</h2><p>${c.count} assets on ${esc(c.sources.join(', '))}${c.url ? ` · <a href="${esc(c.url)}" target="_blank" rel="noopener">Creator's page ↗</a>` : ''}</p>`; track('view', c.slug); }
  } else writeUrl(p);
  const r = search(items, { ...p, limit: 200, offset: 0 });
  lastResults = fullResults(p);
  $('#main').innerHTML = head + `<p class="note">${r.total.toLocaleString()} results</p><div class="grid" id="grid">${lastResults.slice(0, shown).map(card).join('')}</div>${lastResults.length > shown ? '<button id="more" class="more">Load more</button>' : ''}`;
}
function fullResults(p) { const out = []; let off = 0, r; do { r = search(items, { ...p, limit: 200, offset: off }); out.push(...r.results); off += 200; } while (off < r.total); return out; }

let t; const rerender = () => { clearTimeout(t); t = setTimeout(() => { shown = PAGE; render(); }, 120); };
document.addEventListener('click', e => {
  const out = e.target.closest('a[data-out]'); if (out) track('click', out.dataset.out, out.dataset.id);
  if (e.target.matches('[data-copy]')) { const ta = e.target.previousElementSibling; ta.select(); navigator.clipboard?.writeText(ta.value); e.target.textContent = 'Copied'; }
  if (e.target.matches('#more')) { shown += PAGE; const g = $('#grid'); g.insertAdjacentHTML('beforeend', lastResults.slice(shown - PAGE, shown).map(card).join('')); if (shown >= lastResults.length) e.target.remove(); }
  if (e.target.matches('#qv .close') || e.target.id === 'qv') $('#qv').close();
  const c = e.target.closest('[data-qv]'); if (c) quickView(byId.get(c.dataset.qv));
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset?.qv) quickView(byId.get(e.target.dataset.qv)); });
for (const f of FIELDS) $('#' + f).addEventListener('input', rerender);
addEventListener('hashchange', () => { shown = PAGE; render(); });
const qs = new URLSearchParams(location.search); for (const f of FIELDS) if (qs.has(f)) $('#' + f).value = qs.get(f);
items = await (await fetch('api/search-index.json')).json();
byId = new Map(items.map(i => [i.id, i]));
$('#count').textContent = `${items.length.toLocaleString()} assets indexed.`;
render();
