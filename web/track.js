// Per-creator view/click tracking.
// Always counts in localStorage (this browser). If config.json sets trackEndpoint, events are also sent
// there (Supabase RPC when trackKey is set, otherwise plain JSON for the Docker server's /api/track).
// Any network failure is ignored, so the static site keeps working if the endpoint is down.
const KEY = 'fai-stats-v1';
let config = null;
const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export async function loadConfig() {
  if (!config) config = fetch('config.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  return config;
}
export function buildTrackRequest(cfg, ev) {
  if (!cfg?.trackEndpoint) return null;
  if (cfg.trackKey) return { url: cfg.trackEndpoint, init: { method: 'POST', keepalive: true, headers: { apikey: cfg.trackKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_type: ev.type, p_creator: ev.creator, p_item: ev.item ?? null }) } };
  return { url: cfg.trackEndpoint, init: { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) } };
}
export function localStats() { try { return JSON.parse(ls()?.getItem(KEY)) || {}; } catch { return {}; } }
export async function globalStats() {
  const cfg = await loadConfig(); if (!cfg.statsEndpoint) return null;
  try {
    const r = await fetch(cfg.statsEndpoint, { method: 'POST', headers: cfg.trackKey ? { apikey: cfg.trackKey, 'Content-Type': 'application/json' } : {}, body: '{}' });
    if (!r.ok) return null; const rows = await r.json();
    return Object.fromEntries(rows.map(x => [x.creator, { views: Number(x.views), clicks: Number(x.clicks) }]));
  } catch { return null; }
}
export function track(type, creator, item = null) {
  const s = localStats(); const c = s[creator] ||= { views: 0, clicks: 0 };
  c[type === 'click' ? 'clicks' : 'views']++;
  try { ls()?.setItem(KEY, JSON.stringify(s)); } catch {}
  loadConfig().then(cfg => { const req = buildTrackRequest(cfg, { type, creator, item }); if (req) fetch(req.url, req.init).catch(() => {}); }).catch(() => {});
}
