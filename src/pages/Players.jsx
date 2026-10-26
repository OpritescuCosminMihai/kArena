import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData, useVoterName } from '../state/data';
import { useSession } from '../state/session';
import { gamesList, pickemOverall, playerStats } from '../lib/engine';
import { Avatar, Empty, FormChips } from '../components/ui';

export function useGameFilter(list) {
  const [params, setParams] = useSearchParams();
  const games = useMemo(() => gamesList(list), [list]);
  const raw = params.get('joc') || '';
  const game = games.some((g) => g.key === raw) ? raw : '';
  const setGame = (k) => setParams(k ? { joc: k } : {}, { replace: true });
  return { games, game, setGame, label: game ? (games.find((g) => g.key === game) || {}).label : '' };
}

export function GameChips({ games, game, setGame }) {
  if (!games.length) return null;
  return (
    <div className="gchips" role="group" aria-label="Filtrează după joc">
      <button type="button" className="gchip" aria-pressed={!game} onClick={() => setGame('')}>Toate jocurile</button>
      {games.map((g) => (
        <button type="button" key={g.key} className="gchip" aria-pressed={game === g.key} onClick={() => setGame(g.key)}>
          {g.label} <small>{g.n}</small>
        </button>
      ))}
    </div>
  );
}

export const playerLink = (key, game) => `/jucatori/${encodeURIComponent(key)}${game ? '?joc=' + encodeURIComponent(game) : ''}`;

export default function Players() {
  const { list, loaded, profiles, picks } = useData();
  const { uid } = useSession();
  const voterName = useVoterName();
  const nav = useNavigate();
  const { games, game, setGame, label } = useGameFilter(list);
  const { list: players, ts } = useMemo(() => playerStats(list, profiles, game), [list, profiles, game]);
  const pk = useMemo(() => pickemOverall(list, picks, game), [list, picks, game]);

  if (!loaded) return <Empty>Se încarcă statisticile…</Empty>;

  const head = (
    <header className="thead">
      <span className="label" style={{ '--i': 0 }}>Hall of Fame · {label ? label + ' · ' : ''}{ts.length} {ts.length === 1 ? 'turneu' : 'turnee'}</span>
      <h1 className="ttitle" style={{ '--i': 1 }}>Jucători</h1>
      <GameChips games={games} game={game} setGame={setGame} />
    </header>
  );
  if (!players.length) return <div className="page enter">{head}<Empty title="Încă nu sunt statistici">Apar aici după primul turneu cu rezultate.</Empty></div>;

  const top = players.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const byTitles = [...players].sort((a, b) => b.titles - a.titles || b.finals - a.finals)[0];
  const byPct = [...players].filter((o) => o.n >= 5).sort((a, b) => b.pct - a.pct || b.n - a.n)[0];
  const byStreak = [...players].sort((a, b) => b.streak - a.streak)[0];
  let rivalry = null;
  players.forEach((o) => Object.entries(o.h2h).forEach(([k, h]) => {
    const n = h.w + h.l + h.d;
    if (o.key < k && (!rivalry || n > rivalry.n)) rivalry = { a: o, b: players.find((x) => x.key === k), n, h };
  }));
  const records = [
    byTitles && byTitles.titles ? { l: 'Cele mai multe titluri', b: byTitles.display, v: `${byTitles.titles} ${byTitles.titles === 1 ? 'titlu' : 'titluri'}, ${byTitles.finals} finale` } : null,
    byPct ? { l: 'Cel mai bun procent', b: byPct.display, v: `${byPct.pct}% din ${byPct.n} meciuri` } : null,
    byStreak && byStreak.streak > 1 ? { l: 'Cea mai lungă serie', b: byStreak.display, v: `${byStreak.streak} victorii la rând` } : null,
    rivalry && rivalry.b && rivalry.n > 1 ? { l: 'Cea mai mare rivalitate', b: `${rivalry.a.display} vs ${rivalry.b.display}`, v: `${rivalry.n} meciuri directe · ${rivalry.h.w}–${rivalry.h.l}${rivalry.h.d ? '–' + rivalry.h.d : ''}` } : null
  ].filter(Boolean);

  return (
    <div className="page enter">
      {head}
      <section className="block">
        <div className="podium">
          {order.map((o) => {
            const r = players.indexOf(o) + 1;
            return (
              <button type="button" key={o.key} className={'pod p' + r} onClick={() => nav(playerLink(o.key, game))}>
                <span className="rk">{r}</span><Avatar name={o.display} /><span className="pn">{o.display}</span>
                <span className="ps">{o.pts} pct · {o.titles} {o.titles === 1 ? 'titlu' : 'titluri'} · {o.pct}% victorii</span>
              </button>
            );
          })}
        </div>
      </section>
      {records.length > 0 && (
        <section className="block">
          <div className="bhead"><h2>Recorduri</h2></div>
          <div className="records">{records.map((r) => <div className="rec" key={r.l}><span className="label">{r.l}</span><b>{r.b}</b><span className="v">{r.v}</span></div>)}</div>
        </section>
      )}
      <section className="block">
        <div className="bhead"><h2>Clasament general</h2><p>Campion 10 pct, locul 2 6 pct, locul 3 4 pct, plus 1 pct pentru fiecare turneu jucat.</p></div>
        <div className="tscroll">
          <table>
            <thead><tr><th style={{ textAlign: 'left' }}>#</th><th className="name">Jucător</th><th>Turnee</th><th>Titluri</th><th>Finale</th><th title="Victorii-Egaluri-Înfrângeri">V-E-Î</th><th>%</th><th>Formă</th><th>Pct</th></tr></thead>
            <tbody>
              {players.map((o, i) => (
                <tr key={o.key} className={'click' + (i === 0 ? ' lead' : '')} onClick={() => nav(playerLink(o.key, game))}>
                  <td className="pos">{i + 1}</td>
                  <td className="name"><div><Avatar name={o.display} /><Link to={playerLink(o.key, game)} onClick={(e) => e.stopPropagation()}>{o.display}</Link></div></td>
                  <td>{o.tours.length}</td><td>{o.titles}</td><td>{o.finals}</td>
                  <td className="mono">{o.w}-{o.d}-{o.l}</td><td>{o.n ? o.pct + '%' : '–'}</td>
                  <td><FormChips games={o.games} /></td><td className="pts">{o.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {pk.length > 0 && (
        <section className="block">
          <div className="bhead"><h2>Cei mai buni ghicitori</h2><p>Pick'em adunat din {game ? 'turneele de ' + label : 'toate turneele'}.</p></div>
          <ol className="pk-board">
            {pk.slice(0, 10).map((r, i) => (
              <li key={r.uid} className={`pk-row ${i === 0 && r.pts ? 'lead' : ''} ${r.uid === uid ? 'me' : ''}`}>
                <span className="pk-rank">{i + 1}</span><Avatar name={voterName(r.uid)} />
                <span className="pk-name"><span>{voterName(r.uid)}</span>{r.uid === uid && <span className="you">tu</span>}</span>
                <span className="pk-acc">{r.ok}/{r.dec}</span><span className="pk-pts">{r.pts}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
