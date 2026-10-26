export const pad = (n) => String(n).padStart(2, '0');

export function hue(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

export function initials(n) {
  const w = String(n || '?').trim().split(/\s+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '')[1] || '')).toUpperCase();
}

export const fmtDate = (ms) =>
  new Date(ms).toLocaleString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Firestore Timestamp, ISO string or millis -> millis
export const toMs = (v) => (v && v.toMillis ? v.toMillis() : v ? new Date(v).getTime() : 0);

export const newId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const prefersCalm = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
