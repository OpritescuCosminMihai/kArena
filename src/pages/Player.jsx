import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../state/data';
import { useSession } from '../state/session';
import { playerStats } from '../lib/engine';
import { Avatar, Empty, FormChips } from '../components/ui';
import { GameChips, playerLink, useGameFilter } from './Players';

const placeTag = (x) => {
  if (x.place === 1) return <span className="place g">Campion</span>;
  if (x.place === 2) return <span className="place s">Locul 2</span>;
  if (x.place === 3) return <span className="place s">Locul 3</span>;
  if (x.place) return <span className="place">Locul {x.place}</span>;
  return <span className="place">{x.done ? 'Participant' : 'În desfășurare'}</span>;
};

export default function Player() {
  const { key: rawKey } = useParams();
  const key = decodeURIComponent(rawKey);
  const { list, loaded, profiles } = useData();
  const { uid } = useSession();
  const nav = useNavigate();
  const { games, game, setGame, label } = useGameFilter(list);
  const all = useMemo(() => playerStats(list, profiles, ''), [list, profiles]);
  const filtered = useMemo(() => (game ? playerStats(list, profiles, game) : all), [list, profiles, game, all]);
  const perGame = useMemo(() => (!game && games.length > 1
    ? games.map((g) => ({ g, x: playerStats(list, profiles, g.key).P[key] })).filter((r) => r.x)
    : []), [game, games, list, profiles, key]);

  const back = <div className="tbar"><Link className="btn quiet" to={'/jucatori' + (game ? '?joc=' + encodeURIComponent(game) : '')}>← Toți jucătorii</Link></div>;
  if (!loaded) return <Empty>Se încarcă…</Empty>;
  const anywhere = all.P[key];
  const o = filtered.P[key];
  if (!anywhere) return <div className="page">{back}<Empty title="Jucătorul nu a fost găsit">Poate a fost redenumit sau turneul lui a fost șters.</Empty></div>;
  if (!o) {
    return (
      <div className="page">{back}
        <header className="thead"><h1 className="ttitle">{anywhere.display}</h1><GameChips games={games} game={game} setGame={setGame} /></header>
        <Empty title={`N-a jucat încă ${label}`}>Alege alt joc sau „Toate jocurile”.</Empty>
      </div>
    );
  }
  const rank = filtered.list.indexOf(o) + 1;
  const rivals = Object.entries(o.h2h).map(([k, h]) => ({ k, h, n: h.w + h.l + h.d, p: filtered.P[k] })).filter((r) => r.p).sort((a, b) => b.n - a.n || b.h.w - a.h.w);
  const nemesis = [...rivals].filter((r) => r.h.l > r.h.w).sort((a, b) => (b.h.l - b.h.w) - (a.h.l - a.h.w) || b.h.l - a.h.l)[0];
  const victim = [...rivals].filter((r) => r.h.w > r.h.l).sort((a, b) => (b.h.w - b.h.l) - (a.h.w - a.h.l) || b.h.w - a.h.w)[0];
  const tours = [...o.tours].reverse();

  return (
    <div className="page enter">
      {back}
      <header className="thead">
        <span className="label" style={{ '--i': 0 }}>Locul {rank} în clasament{game ? ' · ' + label : ' general'}{o.uid && o.uid === uid ? ' · tu' : ''}</span>
        <h1 className="ttitle" style={{ '--i': 1 }}>{o.display}</h1>
        <GameChips games={games} game={game} setGame={setGame} />
        <div className="meta" style={{ '--i': 2 }}>
          <div className="m"><span className="label">Titluri</span><b>{o.titles}</b></div>
          <div className="m"><span className="label">Finale</span><b>{o.finals}</b></div>
          <div className="m"><span className="label">Meciuri</span><b style={{ fontFamily: 'var(--f-display)' }}>{o.w}<small>V</small> {o.l}<small>Î</small>{o.d ? <> {o.d}<small>E</small></> : null}</b></div>
          <div className="m"><span className="label">Victorii</span><b>{o.n ? o.pct + '%' : '–'}</b></div>
          <div className="m"><span className="label">Puncte</span><b>{o.pts}</b></div>
          <div className="m grow"><span className="label">Forma (ultimele 10)</span><b>{o.games.length ? <FormChips games={o.games} n={10} /> : <small>fără meciuri</small>}</b></div>
        </div>
      </header>
      {perGame.length > 0 && (
        <section className="block">
          <div className="bhead"><h2>Pe jocuri</h2><p>Apasă pe un joc ca să vezi doar statisticile lui.</p></div>
          <div className="tscroll">
            <table>
              <thead><tr><th className="name">Joc</th><th>Turnee</th><th>Titluri</th><th>V-E-Î</th><th>%</th><th>Pct</th></tr></thead>
              <tbody>
                {perGame.map(({ g, x }) => (
                  <tr key={g.key} className="click" onClick={() => setGame(g.key)}>
                    <td className="name"><div><span>{g.label}</span></div></td>
                    <td>{x.tours.length}</td><td>{x.titles}</td><td className="mono">{x.w}-{x.d}-{x.l}</td><td>{x.n ? x.pct + '%' : '–'}</td><td className="pts">{x.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="block">
        <div className="bhead"><h2>Turnee</h2><p>{o.tours.length} {o.tours.length === 1 ? 'turneu' : 'turnee'}{o.best ? ` · cel mai bun loc: ${o.best === 1 ? 'campion' : 'locul ' + o.best}` : ''}</p></div>
        <ul className="hist">
          {tours.map((x) => (
            <li key={x.id} onClick={() => nav('/turneu/' + x.id)}>
              <Link className="hn" to={'/turneu/' + x.id} onClick={(e) => e.stopPropagation()}>{x.name}</Link>
              <span className="label">{x.game || ''}</span>{placeTag(x)}
            </li>
          ))}
        </ul>
      </section>
      {rivals.length > 0 && (
        <section className="block">
          <div className="bhead"><h2>Rivali</h2><p>Scorul meciurilor directe.</p></div>
          <div className="rivals">
            {rivals.map((r) => (
              <Link key={r.k} className="riv" to={playerLink(r.k, game)}>
                <Avatar name={r.p.display} /><span className="n">{r.p.display}</span>
                {nemesis && nemesis.k === r.k ? <span className="tag nem">nemesis</span> : victim && victim.k === r.k ? <span className="tag vic">victimă</span> : null}
                <span className="h2h">{r.h.w}–{r.h.l}{r.h.d ? '–' + r.h.d : ''}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
