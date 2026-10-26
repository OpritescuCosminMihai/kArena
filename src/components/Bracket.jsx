import { useEffect, useState } from 'react';
import MatchCard from './MatchCard';

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 620);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 620);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return narrow;
}

function roundName(r, total, dbl) {
  const f = total - r;
  if (f === 0) return dbl ? 'Finala câștigătorilor' : 'Finala';
  if (f === 1) return 'Semifinale';
  if (f === 2) return 'Sferturi';
  return 'Runda ' + r;
}

// Lays the bracket out on a canvas: each match sits halfway between the
// matches that feed it; SVG wires join feeder -> match exactly.
function layout(m, narrow) {
  const CW = narrow ? 214 : 250, HG = narrow ? 40 : 60, CH = 94, VG = 16, TH = 34, SH = 56, step = CW + HG;
  const st = m.st, ev = m.ev, vis = new Set(), pos = {}, titles = [], secs = [];
  const W = st.W;
  W.flat().forEach((id) => vis.add(id));
  const L = st.dbl ? st.L.map((c) => c.filter((id) => { const r = ev(id); return !r.dead && !r.bye; })).filter((c) => c.length) : [];
  L.flat().forEach((id) => vis.add(id));
  const srcOf = (id) => {
    const mm = st.M[id];
    if (mm.reset) return [mm.reset];
    return [mm.a, mm.b].filter((s) => s && s.t === 'w').flatMap((s) => (vis.has(s.m) ? [s.m] : srcOf(s.m)));
  };
  const place = (cols, y0) => {
    let bottom = y0;
    cols.forEach((col, ci) => {
      let prev = null;
      col.forEach((id) => {
        const s = srcOf(id).filter((x) => pos[x]);
        let y = s.length ? s.reduce((a, x) => a + pos[x].y, 0) / s.length : prev == null ? y0 : prev + CH + VG;
        if (prev != null) y = Math.max(y, prev + CH + VG);
        y = Math.max(y, y0);
        pos[id] = { x: ci * step, y };
        prev = y;
        bottom = Math.max(bottom, y + CH);
      });
    });
    return bottom;
  };
  let top = 0;
  if (st.dbl) { secs.push({ y: 0, t: 'Bracket câștigători' }); top = SH; }
  W.forEach((col, ci) => titles.push({ x: ci * step, y: top, t: roundName(ci + 1, W.length, st.dbl), n: col.length, fin: !st.dbl && ci === W.length - 1 }));
  let bottom = place(W, top + TH);
  if (st.dbl) {
    const ly = bottom + 48;
    secs.push({ y: ly, t: 'Bracket învinși' });
    L.forEach((col, ci) => titles.push({ x: ci * step, y: ly + SH, t: ci === L.length - 1 ? 'Finala învinșilor' : 'Runda ' + (ci + 1), n: col.length }));
    bottom = place(L, ly + SH + TH);
    const gfCol = Math.max(W.length, L.length);
    const wf = pos[W[W.length - 1][0]], lf = pos[L[L.length - 1][0]];
    const gy = Math.round((wf.y + lf.y) / 2);
    st.GF.forEach((id, i) => {
      if (ev(id).dead) return;
      vis.add(id);
      pos[id] = { x: (gfCol + i) * step, y: gy };
      titles.push({ x: (gfCol + i) * step, y: gy - TH, t: i ? 'Meci decisiv' : 'Finala mare', fin: true });
    });
  }
  const ids = [...vis].filter((id) => pos[id]);
  const width = Math.max(...ids.map((id) => pos[id].x)) + CW;
  const height = Math.max(bottom, ...ids.map((id) => pos[id].y + CH)) + 4;
  const wires = [];
  ids.forEach((id) => srcOf(id).forEach((s) => {
    if (!pos[s]) return;
    const a = pos[s], b = pos[id];
    const sx = a.x + CW, sy = a.y + CH / 2, tx = b.x, ty = b.y + CH / 2, ex = tx - HG / 2;
    wires.push({ key: s + '>' + id, from: s, col: Math.round(b.x / step), d: `M${sx} ${sy}H${ex}V${ty}H${tx}` });
  }));
  return { ids, pos, titles, secs, wires, width, height, CW, TH, step };
}

export default function Bracket({ m, onOpen, fresh, myUid }) {
  const narrow = useNarrow();
  const L = layout(m, narrow);
  return (
    <div className="cscroll">
      <div className="canvas" style={{ width: L.width, height: L.height }}>
        <svg className="wires" width={L.width} height={L.height} aria-hidden="true">
          {L.wires.map((w) => {
            const hot = !!m.ev(w.from).winner;
            return <path key={w.key} pathLength="1" style={{ '--c': w.col }} className={`${hot ? 'hot' : ''} ${hot && fresh.has(w.from) ? 'fresh' : ''}`} d={w.d} />;
          })}
        </svg>
        {L.secs.map((s) => <div key={s.t} className="csec" style={{ top: s.y }}>{s.t}</div>)}
        {L.titles.map((t) => (
          <div key={t.t + t.x + t.y} className={'ctitle' + (t.fin ? ' fin' : '')} style={{ left: t.x, top: t.y, width: L.CW, height: L.TH - 8, '--c': Math.round(t.x / L.step) }}>
            <span className="label">{t.t}</span>
            {t.n > 1 && <span className="label">{t.n} meciuri</span>}
          </div>
        ))}
        {L.ids.map((id) => (
          <MatchCard key={id} m={m} id={id} label={'#' + m.st.num[id]} r={m.ev(id)} onOpen={onOpen} fresh={fresh.has(id)} myUid={myUid}
            style={{ left: L.pos[id].x, top: L.pos[id].y, width: L.CW, '--c': Math.round(L.pos[id].x / L.step) }} />
        ))}
      </div>
    </div>
  );
}
