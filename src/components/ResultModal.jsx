import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Modal from './Modal';
import { Avatar } from './ui';

// Enter or clear one match result. Elimination matches can't end level.
export default function ResultModal({ t, m, mid, a, b, elim, onClose, toast }) {
  const existingRaw = m.res[mid];
  const existing = existingRaw && existingRaw.a === a && existingRaw.b === b ? existingRaw : null;
  const [mode, setMode] = useState(existing ? (existing.win ? 'win' : 'score') : t.scoring || 'score');
  const [sa, setSa] = useState(existing && !existing.win ? String(existing.sa) : '');
  const [sb, setSb] = useState(existing && !existing.win ? String(existing.sb) : '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const was = existing ? (existing.sa > existing.sb ? 'a' : existing.sb > existing.sa ? 'b' : 'd') : null;

  async function write(val) {
    setBusy(true);
    try {
      if (val) val.at = new Date().toISOString();
      await setDoc(doc(db, 'tournaments', t.id), { results: { [mid]: val } }, { merge: true });
      onClose();
      toast(val ? 'Rezultat salvat' : 'Rezultat șters');
    } catch {
      setBusy(false);
      setErr('Nu s-a putut salva. Încearcă din nou.');
    }
  }
  function saveScore() {
    if (mode !== 'score') return;
    if (sa === '' || sb === '' || +sa < 0 || +sb < 0) return setErr('Completează ambele scoruri.');
    if (elim && +sa === +sb) return setErr('Într-un meci eliminatoriu trebuie să existe un câștigător.');
    write({ a, b, sa: +sa, sb: +sb });
  }
  const pick = (side, id) => (
    <button type="button" className={`pick ${existing && existing.win && was === side ? 'on' : ''}`} disabled={busy}
      onClick={() => write({ a, b, sa: side === 'a' ? 1 : 0, sb: side === 'b' ? 1 : 0, win: true })}>
      <Avatar name={m.names[id]} />
      <span className="label">{existing && existing.win && was === side ? 'Câștigător' : 'Alege câștigătorul'}</span>
      <span className="pn">{m.names[id]}</span>
    </button>
  );

  return (
    <Modal onClose={onClose} labelledBy="r-title" onSubmit={saveScore}>
      <div><span className="label">{elim && m.st && m.st.num[mid] ? 'Meciul #' + m.st.num[mid] : 'Meci de grupă'}</span><h2 id="r-title">Cine a câștigat?</h2></div>
      <div className="modes" role="group" aria-label="Mod de raportare">
        <button type="button" aria-pressed={mode === 'win'} onClick={() => { setMode('win'); setErr(''); }}>Doar câștigătorul</button>
        <button type="button" aria-pressed={mode === 'score'} onClick={() => { setMode('score'); setErr(''); }}>Cu scor</button>
      </div>
      {mode === 'win' ? (
        <div className="picks">
          {pick('a', a)}{pick('b', b)}
          {!elim && (
            <button type="button" className={`pick pick-draw ${existing && existing.win && was === 'd' ? 'on' : ''}`} disabled={busy}
              onClick={() => write({ a, b, sa: 0, sb: 0, win: true })}>Egal</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="versus">
            <div className="side">
              <label htmlFor="s-a"><Avatar name={m.names[a]} /><span>{m.names[a]}</span></label>
              <input type="number" id="s-a" min="0" inputMode="numeric" placeholder="0" value={sa} autoFocus onChange={(e) => setSa(e.target.value)} />
            </div>
            <span className="vs">VS</span>
            <div className="side">
              <label htmlFor="s-b"><Avatar name={m.names[b]} /><span>{m.names[b]}</span></label>
              <input type="number" id="s-b" min="0" inputMode="numeric" placeholder="0" value={sb} onChange={(e) => setSb(e.target.value)} />
            </div>
          </div>
          <p className="note">{elim ? 'Hărți (2–1) sau runde (13–9). Într-un meci eliminatoriu nu poate fi egal.' : 'Egalul e permis și aduce câte un punct fiecăruia.'}</p>
        </div>
      )}
      {err && <p className="err">{err}</p>}
      <div className="actions">
        {mode === 'score' && <button className="btn solid" type="submit" disabled={busy}>Salvează</button>}
        {existing && <button className="btn danger" type="button" disabled={busy} onClick={() => write(null)}>Șterge rezultatul</button>}
        <button className="btn quiet" type="button" onClick={onClose}>Anulează</button>
      </div>
    </Modal>
  );
}
