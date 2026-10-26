import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { FORMATS, GAMES, countError, formatInfo } from '../lib/engine';
import { Avatar, FormatIcon } from '../components/ui';
import { newId, pad, shuffle } from '../lib/util';

export default function Create() {
  const { uid, displayName } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: '', game: '', format: 'single', groups: 4, advance: 2, scoring: 'score',
    reg: 'manual', max: '', deadline: '', parts: '', shuffle: false
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const parts = useMemo(() => [...new Set(f.parts.split('\n').map((s) => s.trim()).filter(Boolean))], [f.parts]);
  const open = f.reg === 'open';

  async function submit(e) {
    e.preventDefault();
    const name = f.name.trim(), game = f.game.trim(), G = +f.groups, A = +f.advance;
    if (!name) return setErr('Dă un nume turneului.');
    let max = 0, deadline = 0;
    if (open) {
      if (parts.length > 128) return setErr('Maxim 128 de participanți.');
      if (f.max !== '') { max = Math.floor(+f.max); if (!(max >= 3 && max <= 128)) return setErr('Limita de locuri trebuie să fie între 3 și 128.'); }
      if (f.deadline) { deadline = new Date(f.deadline).getTime(); if (!(deadline > Date.now())) return setErr('Data de închidere trebuie să fie în viitor.'); }
    } else {
      const ce = countError(f.format, parts.length, G, A);
      if (ce) return setErr(ce);
    }
    const list = !open && f.shuffle ? shuffle(parts) : parts;
    const id = newId('t');
    const data = {
      name, game, format: f.format, scoring: f.scoring,
      participants: list.map((n, i) => ({ id: 'p' + (i + 1), name: n })),
      results: {}, createdAt: new Date().toISOString(),
      ownerUid: uid, ownerName: (displayName || '').slice(0, 60)
    };
    if (f.format === 'groups') { data.groups = G; data.advance = A; }
    if (open) { data.reg = 'open'; if (max) data.max = max; if (deadline) data.deadline = deadline; }
    setBusy(true);
    try {
      await setDoc(doc(db, 'tournaments', id), data);
      toast('Turneu creat');
      nav('/turneu/' + id);
    } catch {
      setBusy(false);
      setErr('Nu s-a putut salva. Verifică dacă ai drept de creare și încearcă din nou.');
    }
  }

  return (
    <div className="page">
      <header className="thead"><span className="label">Turneu nou</span><h1 className="ttitle">Creează</h1></header>
      <form className="cform" onSubmit={submit} noValidate>
        <div className="cmain">
          <div className="field">
            <label htmlFor="f-name">Numele turneului</label>
            <input type="text" id="f-name" className="title-input" maxLength={80} placeholder="Cupa de toamnă" autoComplete="off" autoFocus value={f.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="f-game">Jocul</label>
            <input type="text" id="f-game" className="game-input" list="games" maxLength={50} placeholder="Valorant, CS2, League of Legends…" autoComplete="off" value={f.game} onChange={set('game')} />
            <datalist id="games">{GAMES.map((g) => <option key={g} value={g} />)}</datalist>
          </div>
          <div className="field">
            <span className="legend">Formatul</span>
            <div className="formats">
              {Object.entries(FORMATS).map(([k, x]) => (
                <label className="fmt" key={k}>
                  <input type="radio" name="fmt" value={k} checked={f.format === k} onChange={set('format')} />
                  <FormatIcon format={k} /><b>{x.name}</b><span className="d">{x.desc}</span>
                </label>
              ))}
            </div>
          </div>
          {f.format === 'groups' && (
            <div className="row2">
              <div className="field"><label htmlFor="f-groups">Număr de grupe</label>
                <select id="f-groups" value={f.groups} onChange={set('groups')}>{[2, 3, 4, 6, 8].map((n) => <option key={n}>{n}</option>)}</select></div>
              <div className="field"><label htmlFor="f-adv">Avansează din fiecare grupă</label>
                <select id="f-adv" value={f.advance} onChange={set('advance')}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></div>
            </div>
          )}
          <div className="field">
            <span className="legend">Cum raportezi rezultatele</span>
            <div className="modes" role="group" aria-label="Cum raportezi rezultatele">
              <button type="button" aria-pressed={f.scoring === 'win'} onClick={() => set('scoring')('win')}>Doar câștigătorul</button>
              <button type="button" aria-pressed={f.scoring === 'score'} onClick={() => set('scoring')('score')}>Cu scor</button>
            </div>
            <span className="note">{f.scoring === 'win' ? 'Alegi doar cine a câștigat, cu un click. Potrivit pentru 1v1.' : 'Introduci scorul fiecărui meci, de ex. 2–1 sau 13–9.'}</span>
          </div>
          <div className="field">
            <span className="legend">Participanții</span>
            <div className="modes" role="group" aria-label="Cum se adaugă participanții">
              <button type="button" aria-pressed={!open} onClick={() => set('reg')('manual')}>Îi adaug eu</button>
              <button type="button" aria-pressed={open} onClick={() => set('reg')('open')}>Se înscriu singuri</button>
            </div>
            <span className="note">{open ? 'Membrii se înscriu din pagina turneului, iar tu pornești turneul când ești gata.' : 'Scrii lista acum, iar bracket-ul se generează imediat.'}</span>
          </div>
          {open && (
            <div className="regopts">
              <div className="field"><label htmlFor="f-max">Limită de locuri (opțional)</label>
                <input type="number" id="f-max" min="3" max="128" inputMode="numeric" placeholder="fără limită" value={f.max} onChange={set('max')} /></div>
              <div className="field"><label htmlFor="f-deadline">Închiderea înscrierilor (opțional)</label>
                <input type="datetime-local" id="f-deadline" value={f.deadline} onChange={set('deadline')} /></div>
            </div>
          )}
          <div className="field">
            <label htmlFor="f-parts">{open ? 'Adaugi și tu câțiva acum? (opțional)' : 'Participanți, câte unul pe rând'}</label>
            <textarea id="f-parts" placeholder={'Phoenix Rising\nNight Owls\nCarpathian Wolves\n…'} value={f.parts} onChange={set('parts')} />
          </div>
          {!open && <label className="check"><input type="checkbox" checked={f.shuffle} onChange={set('shuffle')} /> Tragere la sorți: amestecă ordinea capilor de serie</label>}
          {err && <p className="err">{err}</p>}
          <div className="actions">
            <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Se creează…' : 'Creează turneul →'}</button>
            <button className="btn quiet" type="button" onClick={() => nav('/turnee')}>Anulează</button>
          </div>
        </div>
        <aside className="cside">
          <span className="label">Participanți</span>
          <span className="count">{pad(parts.length)}</span>
          <p className="note">{open && !parts.length ? 'Lista se completează pe măsură ce se înscriu membrii.' : formatInfo(f.format, parts.length, +f.groups)}</p>
          <ul className="plist">
            {parts.slice(0, 128).map((n, i) => <li key={n}><span className="s">{i + 1}</span><Avatar name={n} /><span className="n">{n}</span></li>)}
          </ul>
        </aside>
      </form>
    </div>
  );
}
