import { Avatar } from './ui';

// r: { a, b, bye, ready, res, winner } where a/b are {id} | {label} | {dead}
export default function MatchCard({ m, id, label, r, style, onOpen, fresh, myUid }) {
  if (r.bye) {
    const s = r.a.dead ? r.b : r.a;
    return (
      <div className="match bye" style={style}>
        <span className="byepill">
          {s.id && <><span className="seed">{m.seed[s.id] || ''}</span><Avatar name={m.names[s.id]} /></>}
          <span className={'nm' + (s.id ? '' : ' tbd')}>{s.id ? m.names[s.id] : s.label || 'De stabilit'}</span>
          <span className="label">trece direct</span>
        </span>
      </div>
    );
  }
  const editable = !!onOpen && r.ready && !(r.res && r.res.wo);
  const state = r.ready && !r.res ? 'ready' : r.res ? 'done' : 'wait';
  const score = (side) => {
    const q = r.res;
    if (!q) return '';
    if (!q.win) return side === 'a' ? q.sa : q.sb;
    if (q.sa === q.sb) return '=';
    return (side === 'a') === (q.sa > q.sb) ? 'W' : 'L';
  };
  const row = (s, side) => {
    if (!s.id) {
      return <span className="prow"><span className="nm tbd">{s.label || 'De stabilit'}</span><span className="sc" /></span>;
    }
    const cls = r.winner ? (s.id === r.winner ? 'win' : 'lose') : '';
    const gone = m.gone.has(s.id);
    const mine = myUid && m.uidOf[s.id] === myUid;
    return (
      <span className={`prow ${cls} ${gone ? 'is-out' : ''} ${mine ? 'mine' : ''}`}>
        <span className="seed">{m.seed[s.id] || ''}</span>
        <Avatar name={m.names[s.id]} />
        <span className="nm">{m.names[s.id] || '?'}</span>
        {mine && <span className="tag-me">tu</span>}
        {gone && <span className="tag-out">abandon</span>}
        <span className="sc">{score(side)}</span>
      </span>
    );
  };
  const cls = `match ${state} ${fresh ? 'fresh' : ''}`;
  const body = (
    <>
      <span className="rail"><span>{label}</span></span>
      <span className="rows">{row(r.a, 'a')}{row(r.b, 'b')}</span>
    </>
  );
  if (editable) {
    return <button type="button" className={cls} style={style} onClick={() => onOpen(id)} aria-label={`Rezultat meci ${label}`}>{body}</button>;
  }
  return <div className={cls} style={style}>{body}</div>;
}
