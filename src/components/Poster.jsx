import { useMemo, useRef } from 'react';
import { GAMES } from '../lib/engine';
import { prefersCalm } from '../lib/util';
import { KMark } from './ui';

// Dark poster: rows of outlined game names drift in opposite directions,
// the field tilts slightly toward the pointer.
// title: plain text, or logo={true} to draw the kArena logotype.
export default function Poster({ title, logo, sup, topLeft, topRight, games = [], children }) {
  const field = useRef(null);
  const raf = useRef(0);
  const names = useMemo(() => [...new Set([...games.filter(Boolean), ...GAMES])], [games]);
  const rows = useMemo(() => Array.from({ length: 7 }, (_, r) => {
    const seq = names.map((_, i) => names[(i * 3 + r * 5) % names.length]);
    const words = seq.flatMap((n, i) => [
      <span key={'w' + i} className={(i + r) % 7 === 0 ? 'f' : (i + r * 2) % 11 === 0 ? 'v' : ''}>{n}</span>,
      <i key={'s' + i}>■</i>
    ]);
    return { r, words, dur: 70 + ((r * 37) % 5) * 14 };
  }), [names]);

  const move = (e) => {
    if (prefersCalm() || !field.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - box.left) / box.width - 0.5, my = (e.clientY - box.top) / box.height - 0.5;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      field.current.style.setProperty('--mx', mx.toFixed(3));
      field.current.style.setProperty('--my', my.toFixed(3));
    });
  };
  const leave = () => { if (field.current) { field.current.style.setProperty('--mx', 0); field.current.style.setProperty('--my', 0); } };

  return (
    <section className={'poster' + (prefersCalm() ? '' : ' enter')} aria-label={title} onPointerMove={move} onPointerLeave={leave}>
      <div className="field" ref={field} aria-hidden="true">
        {rows.map(({ r, words, dur }) => (
          <div key={r} className={'rowt' + (r % 2 ? ' rev' : '')} style={{ '--dur': dur + 's' }}>{words}{words}</div>
        ))}
      </div>
      <div className="ptop"><span>{topLeft}</span><span>{topRight}</span></div>
      <div className="pbot">
        <h1 className={'giant' + (logo ? ' logotype' : '')} aria-label={title}>
          {logo && <span className="ch kch" style={{ '--i': 0 }} aria-hidden="true"><KMark /></span>}
          {[...(logo ? 'rena' : title)].map((c, i) => <span key={i} className="ch" style={{ '--i': i + (logo ? 1 : 0) }} aria-hidden="true">{c}</span>)}
          {sup && <sup>{sup}</sup>}
        </h1>
        {children}
      </div>
    </section>
  );
}
