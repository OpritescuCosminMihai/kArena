import { prefersCalm } from './util';

// Short burst from both sides of the screen when a champion is decided.
export function confetti() {
  if (prefersCalm()) return;
  const c = document.createElement('canvas');
  c.id = 'fx';
  document.body.appendChild(c);
  const ctx = c.getContext('2d'), dpr = window.devicePixelRatio || 1;
  const W = (c.width = window.innerWidth * dpr), H = (c.height = window.innerHeight * dpr);
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--volt', '--violet', '--ink'].map((v) => cs.getPropertyValue(v).trim() || '#E3FA52');
  const P = Array.from({ length: 150 }, (_, i) => ({
    x: W * (i % 2 ? 0.15 : 0.85), y: H * 0.55,
    vx: (i % 2 ? 1 : -1) * (4 + Math.random() * 10) * dpr, vy: -(8 + Math.random() * 14) * dpr,
    s: (5 + Math.random() * 7) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % 3]
  }));
  const t0 = performance.now();
  (function frame(now) {
    const k = (now - t0) / 2200;
    ctx.clearRect(0, 0, W, H);
    P.forEach((p) => {
      p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (k < 1) requestAnimationFrame(frame); else c.remove();
  })(t0);
}
