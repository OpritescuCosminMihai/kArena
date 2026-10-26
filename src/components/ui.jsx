import { hue, initials } from '../lib/util';

export function Avatar({ name, size, className = '' }) {
  const style = { '--h': hue(name) };
  if (size) Object.assign(style, { width: size, height: size, fontSize: Math.round(size * 0.32) });
  return <span className={'av ' + className} style={style} aria-hidden="true">{initials(name)}</span>;
}

const FORMAT_PATHS = {
  single: <path d="M2 2h6v8H2M8 6h8" />,
  double: <path d="M1 1h5v4H1M6 3h5M1 7h5v4H1M6 9h5M11 3v6M11 6h6" />,
  rr: <path d="M2 2h.01M9 2h.01M16 2h.01M2 6h.01M9 6h.01M16 6h.01M2 10h.01M9 10h.01M16 10h.01" strokeWidth="3" />,
  groups: <path d="M1 1h6v4H1zM1 7h6v4H1zM7 3h4v6H7M11 6h6" />
};

export const FormatIcon = ({ format }) => (
  <svg className="ic" viewBox="0 0 18 12" aria-hidden="true">{FORMAT_PATHS[format]}</svg>
);

export const Trophy = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8 21h8M9 17h6v4H9z" /></svg>
);

// kArena mark: a K whose lower half, closed by a crossbar, reads as an A.
// Every inner stroke ends exactly on the centre line of the stroke it meets,
// and caps/joins are round, so no corner pokes out of the letter.
export const KMark = ({ className = '' }) => (
  <svg className={'kmark ' + className} viewBox="2 -2 40 44" aria-hidden="true">
    <path d="M7 2Q15 20 7 38" />
    <path d="M11 20L35 2" />
    <path d="M11 20L38 38" />
    <path d="M9.5 31H27.5" />
  </svg>
);

export const Wordmark = () => (
  <span className="wordmark"><KMark /><span>rena</span></span>
);

export function Segs({ done, total }) {
  if (total > 48) {
    return <span className="segs" aria-hidden="true"><i className="on" style={{ flex: done }} /><i style={{ flex: total - done }} /></span>;
  }
  return (
    <span className="segs" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? 'on' : ''} />)}
    </span>
  );
}

export function FormChips({ games, n = 5 }) {
  return (
    <span className="form" aria-label="Forma recentă">
      {games.slice(-n).map((g, i) => (
        <i key={i} className={g.v > 0 ? 'w' : g.v < 0 ? 'l' : ''}>{g.v > 0 ? 'V' : g.v < 0 ? 'Î' : 'E'}</i>
      ))}
    </span>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      {title && <strong>{title}</strong>}
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
