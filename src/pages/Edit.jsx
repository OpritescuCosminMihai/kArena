import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../state/data';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { GAMES, countError } from '../lib/engine';
import { Avatar, Empty } from '../components/ui';
import { pad, shuffle } from '../lib/util';

function EditForm({ t }) {
  const toast = useToast();
  const nav = useNavigate();
  const started = Object.values(t.results || {}).some(Boolean);
  const open = t.reg === 'open';
  const [name, setName] = useState(t.name);
  const [game, setGame] = useState(t.game || '');
  const [parts, setParts] = useState(() => (t.participants || []).map((p) => ({ ...p })));
  const [out, setOut] = useState(() => new Set(t.out || []));
  const [add, setAdd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  const move = (i, j) => setParts((P) => { const n = P.slice(); const [x] = n.splice(i, 1); n.splice(j, 0, x); return n; });
  function addPart() {
    const n = add.trim();
    if (!n) return;
    if (parts.some((p) => p.name.trim().toLowerCase() === n.toLowerCase())) return setErr(`„${n}” e deja în listă.`);
    const max = parts.reduce((a, p) => Math.max(a, +p.id.slice(1) || 0), 0);
    setParts((P) => [...P, { id: 'p' + (max + 1), name: n }]);
    setAdd('');
    setErr('');
  }
  function startDrag(e, i) {
    e.preventDefault();
    const rows = [...listRef.current.children];
    const row = rows[i];
    const tops = rows.map((r) => r.getBoundingClientRect().top);
    const step = rows.length > 1 ? tops[1] - tops[0] : row.getBoundingClientRect().height;
    const y0 = e.clientY;
    let to = i;
    row.classList.add('dragging');
    const onMove = (ev) => {
      const dy = ev.clientY - y0;
      row.style.transform = `translateY(${dy}px)`;
      to = Math.max(0, Math.min(rows.length - 1, Math.round(i + dy / step)));
      rows.forEach((r, k) => {
        if (k === i) return;
        const sh = k > i && k <= to ? -step : k < i && k >= to ? step : 0;
        r.style.transform = sh ? `translateY(${sh}px)` : '';
      });
    };
    const end = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      rows.forEach((r) => { r.style.transform = ''; });
      row.classList.remove('dragging');
      if (to !== i) move(i, to);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  async function save(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setErr('Dă un nume turneului.');
    if (parts.some((p) => !p.name.trim())) return setErr('Fiecare participant are nevoie de un nume.');
    const lc = parts.map((p) => p.name.trim().toLowerCase());
    if (new Set(lc).size !== lc.length) return setErr('Doi participanți au același nume. Schimbă unul dintre ele.');
    if (!started && !open) {
      const ce = countError(t.format, parts.length, t.groups || 2, t.advance || 2);
      if (ce) return setErr(ce);
    }
    setBusy(true);
    const data = {
      name: n, game: game.trim(),
      participants: parts.map((p) => (p.uid ? { id: p.id, name: p.name.trim(), uid: p.uid } : { id: p.id, name: p.name.trim() })),
      out: [...out].filter((id) => parts.some((p) => p.id === id))
    };
    try {
      await updateDoc(doc(db, 'tournaments', t.id), data);
      toast('Modificări salvate');
      nav('/turneu/' + t.id);
    } catch {
      setBusy(false);
      setErr('Nu s-a putut salva. Încearcă din nou.');
    }
  }

  return (
    <form className="cform" onSubmit={save} noValidate>
      <div className="cmain">
        <div className="field"><label htmlFor="e-name">Numele turneului</label>
          <input type="text" id="e-name" className="title-input" maxLength={80} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="e-game">Jocul</label>
          <input type="text" id="e-game" className="game-input" list="games-e" maxLength={50} value={game} autoComplete="off" onChange={(e) => setGame(e.target.value)} />
          <datalist id="games-e">{GAMES.map((g) => <option key={g} value={g} />)}</datalist></div>
        <div className="field">
          <span className="legend">{open ? 'Participanți adăugați de tine' : 'Participanți'}{!started && parts.length > 1 ? ' · trage de ⠿ ca să schimbi ordinea' : ''}</span>
          <ul className="elist" ref={listRef}>
            {parts.map((p, i) => {
              const o = out.has(p.id);
              return (
                <li key={p.id} className={'erow' + (o ? ' is-out' : '')}>
                  {!started && (
                    <button type="button" className="handle" aria-label={`Mută ${p.name}, folosește săgețile sus și jos`}
                      onPointerDown={(e) => startDrag(e, i)}
                      onKeyDown={(e) => {
                        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                        e.preventDefault();
                        const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
                        if (j >= 0 && j < parts.length) move(i, j);
                      }}>⠿</button>
                  )}
                  <span className="s">{i + 1}</span><Avatar name={p.name} />
                  <input type="text" className="ename" maxLength={40} value={p.name} aria-label={`Numele participantului ${i + 1}`}
                    onChange={(e) => setParts((P) => P.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                  {started ? (
                    <button type="button" className="otog" aria-pressed={o}
                      onClick={() => setOut((S) => { const n = new Set(S); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })}>{o ? 'Abandonat' : 'Abandon'}</button>
                  ) : (
                    <button type="button" className="rm" aria-label={`Scoate ${p.name}`} onClick={() => setParts((P) => P.filter((_, k) => k !== i))}>×</button>
                  )}
                </li>
              );
            })}
          </ul>
          {!started && (
            <div className="eadd">
              <input type="text" maxLength={40} value={add} placeholder="Adaugă un participant" autoComplete="off"
                onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPart(); } }} />
              <button type="button" className="btn" onClick={addPart}>Adaugă</button>
            </div>
          )}
        </div>
        {err && <p className="err">{err}</p>}
        <div className="actions">
          <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează modificările'}</button>
          <Link className="btn quiet" to={'/turneu/' + t.id}>Anulează</Link>
        </div>
      </div>
      <aside className="cside">
        <span className="label">{started ? 'Turneul a început' : 'Înainte de primul meci'}</span>
        <span className="count">{pad(parts.length)}</span>
        <p className="note">{started
          ? 'Ordinea și lista sunt blocate, pentru că există rezultate. Poți redenumi participanții sau marca un abandon: adversarii lor câștigă automat meciurile rămase.'
          : 'Poți schimba ordinea capilor de serie, adăuga sau scoate participanți. Bracket-ul se regenerează când salvezi.'}</p>
        {!started && <button type="button" className="btn" onClick={() => setParts((P) => shuffle(P))}>Tragere la sorți</button>}
      </aside>
    </form>
  );
}

export default function Edit() {
  const { id } = useParams();
  const { list, loaded } = useData();
  const { uid, isAdmin } = useSession();
  const t = list.find((x) => x.id === id);
  if (!loaded) return <Empty>Se încarcă…</Empty>;
  if (!t) return <Empty title="Turneul nu există" action={<Link className="btn" to="/turnee">Vezi toate turneele</Link>} />;
  const canManage = t.ownerUid ? t.ownerUid === uid : isAdmin;
  if (!canManage) {
    return <Empty title="Nu poți edita acest turneu" action={<Link className="btn" to={'/turneu/' + t.id}>Înapoi la turneu</Link>}>Doar cel care a creat turneul îl poate modifica.</Empty>;
  }
  return (
    <div className="page">
      <div className="tbar"><Link className="btn quiet" to={'/turneu/' + t.id}>← Înapoi la turneu</Link></div>
      <header className="thead"><span className="label">Editează</span><h1 className="ttitle">{t.name}</h1></header>
      <EditForm t={t} />
    </div>
  );
}
