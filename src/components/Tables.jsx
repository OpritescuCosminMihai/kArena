import { Avatar } from './ui';
import MatchCard from './MatchCard';
import { rrRes } from '../lib/engine';

export function rrMatchProps(m, x) {
  const r = rrRes(x, m.res, m.gone);
  const winner = r ? (r.sa > r.sb ? x.a : r.sb > r.sa ? x.b : null) : null;
  return { a: { id: x.a }, b: { id: x.b }, ready: true, res: r, winner };
}

export function Standings({ m, rows, qualify = 0, lead = false }) {
  return (
    <div className="tscroll">
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>#</th><th className="name">Participant</th>
            <th title="Jucate">J</th><th title="Victorii">V</th><th title="Egaluri">E</th><th title="Înfrângeri">Î</th>
            <th>Scor</th><th title="Diferență">Dif</th><th>Pct</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={`${lead && i === 0 && r.p ? 'lead' : i < qualify ? 'qual' : ''} ${qualify && i === qualify - 1 ? 'cut' : ''}`}>
              <td className="pos">{i + 1}</td>
              <td className="name"><div><Avatar name={m.names[r.id]} /><span>{m.names[r.id]}</span>{m.gone.has(r.id) && <span className="tag-out">abandon</span>}</div></td>
              <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
              <td className="mono">{r.f}:{r.a}</td>
              <td>{r.f - r.a > 0 ? '+' : ''}{r.f - r.a}</td>
              <td className="pts">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoundsList({ m, rounds, tag, onOpen, fresh, myUid }) {
  return (
    <div className="rounds-list">
      {rounds.map((ms, i) => (
        <div className="rl" key={i}>
          <div className="ctitle" style={{ position: 'static', width: '100%' }}>
            <span className="label">Runda {i + 1}</span><span className="label">{ms.length} meciuri</span>
          </div>
          {ms.map((x) => (
            <MatchCard key={x.id} m={m} id={x.id} label={tag ? `${tag}·R${i + 1}` : `R${i + 1}`} r={rrMatchProps(m, x)} onOpen={onOpen} fresh={fresh.has(x.id)} myUid={myUid} />
          ))}
        </div>
      ))}
    </div>
  );
}
