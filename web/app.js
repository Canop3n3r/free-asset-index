import { search, creatorStats } from './lib.mjs';
import { track, localStats } from './track.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FIELDS = ['q', 'kind', 'style', 'format', 'license', 'source'];
let items = [];

function card(i) {
  return `<article class="card"><a href="${esc(i.url)}" target="_blank" rel="noopener" data-out="${esc(i.creatorSlug)}" data-id="${esc(i.id)}">
  ${i.thumbnail ? `<img loading="lazy" src="${esc(i.thumbnail)}" alt="">` : `<div class="noimg">${esc(i.source)}</div>`}
  <h3>${esc(i.title)}</h3></a>
  <p>by <a href="#/creator/${esc(i.creatorSlug)}">${esc(i.creator)}</a> · <a href="${esc(i.licenseUrl)}" target="_blank" rel="noopener" class="lic">${esc(i.license)}</a></p>
  <p class="meta">${esc(i.source)} · ${esc(i.kind || '')} ${i.formats.map(f => `<span class="fmt">${esc(f)}</span>`).join('')}</p>
  <details><summary>Credit line</summary><textarea readonly>${esc(i.attribution)}</textarea><button data-copy>Copy</button></details></article>`;
}

function render() {
  const h = location.hash;
  if (h === '#/creators') {
    const st = localStats();
    $('#filters').hidden = true;
    $('#main').innerHTML = `<h2>Creators</h2><p class="note">Views/clicks are counted in this browser only (see API page).</p><table><tr><th>Creator</th><th>Assets</th><th>Sources</th><th>Views</th><th>Clicks</th></tr>${creatorStats(items).map(c => `<tr><td><a href="#/creator/${esc(c.slug)}">${esc(c.name)}</a></td><td>${c.count}</td><td>${esc(c.sources.join(', '))}</td><td>${st[c.slug]?.views || 0}</td><td>${st[c.slug]?.clicks || 0}</td></tr>`).join('')}</table>`;
    return;
  }
  const m = h.match(/^#\/creator\/(.+)$/);
  $('#filters').hidden = !!m;
  const p = Object.fromEntries(FIELDS.map(f => [f, $('#' + f).value]));
  if (m) { p.creator = decodeURIComponent(m[1]); for (const f of FIELDS) p[f] = ''; }
  const r = search(items, { ...p, limit: 120 });
  let head = '';
  if (m) {
    const c = creatorStats(r.results.length ? items.filter(i => i.creatorSlug === p.creator) : [])[0];
    if (c) { head = `<h2>${esc(c.name)}</h2><p>${c.count} assets on ${esc(c.sources.join(', '))}${c.url ? ` · <a href="${esc(c.url)}" target="_blank" rel="noopener">Creator's page</a>` : ''}</p>`; track('view', c.slug); }
  }
  $('#main').innerHTML = head + `<p class="note">${r.total} results${r.total > r.limit ? ` (showing ${r.limit})` : ''}</p><div class="grid">${r.results.map(card).join('')}</div>`;
}

document.addEventListener('click', e => {
  const a = e.target.closest('a[data-out]'); if (a) track('click', a.dataset.out, a.dataset.id);
  if (e.target.matches('[data-copy]')) { const t = e.target.previousElementSibling; t.select(); navigator.clipboard?.writeText(t.value); e.target.textContent = 'Copied'; }
});
for (const f of FIELDS) $('#' + f).addEventListener('input', () => render());
addEventListener('hashchange', render);
items = await (await fetch('api/items.json')).json();
$('#count').textContent = `${items.length} assets indexed.`;
render();
