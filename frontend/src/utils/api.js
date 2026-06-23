// If VITE_API_URL is explicitly set (and non-empty), use it.
// Otherwise fall back to localhost:4000 for local dev.
const EXPLICIT_URL = import.meta.env.VITE_API_URL; // '' | 'https://...' | undefined
const BASE = EXPLICIT_URL || 'http://localhost:4000';

export async function apiFetch(path, opts = {}) {
  // When EXPLICIT_URL is '' we use relative paths — works for same-origin production.
  const url = EXPLICIT_URL === '' ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export function createWebSocket(onMessage) {
  // Derive the WebSocket URL at runtime so it works in all environments:
  //   - local dev (VITE_API_URL undefined): ws://localhost:4000
  //   - production same-origin (VITE_API_URL = ''): wss://yourapp.onrender.com
  //   - explicit URL: convert http(s) → ws(s)
  let wsUrl;
  if (EXPLICIT_URL === '') {
    // Same-origin: derive from the page's own host at runtime
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    wsUrl = `${proto}://${window.location.host}`;
  } else {
    wsUrl = BASE.replace(/^http/, 'ws');
  }

  const ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch (_) {}
  };
  return ws;
}
