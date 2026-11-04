// Per-creator view/click tracking. Static hosting has no server, so counts live in localStorage
// (this browser only). If config.json sets "trackEndpoint", events are also sent there with sendBeacon.
const KEY = 'fai-stats-v1';
let endpoint = null;
fetch('config.json').then(r => r.ok ? r.json() : {}).then(c => { endpoint = c.trackEndpoint || null; }).catch(() => {});
export function localStats() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
export function track(type, creator, item = null) {
  const s = localStats(); const c = s[creator] ||= { views: 0, clicks: 0 };
  c[type === 'click' ? 'clicks' : 'views']++;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  if (endpoint) navigator.sendBeacon?.(endpoint, JSON.stringify({ type, creator, item, t: Date.now() }));
}
