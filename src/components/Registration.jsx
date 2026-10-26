import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { countError, formatInfo } from '../lib/engine';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { fmtDate, shuffle } from '../lib/util';
import { Avatar } from './ui';

const regClosed = (t) => !!(t.deadline && Date.now() >= t.deadline);

export function useEntries(tid, enabled) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(collection(db, 'tournaments', tid, 'entries'), (q) => {
      setEntries(q.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))));
      setLoaded(true);
    }, () => setLoaded(true));
  }, [tid, enabled]);
  return { entries, loaded };
}

export default function Registration({ t, canManage }) {
  const { uid, displayName } = useSession();
  const toast = useToast();
  const { entries, loaded } = useEntries(t.id, true);
  const pre = t.participants || [];
  const total = pre.length + entries.length;
  const mine = entries.find((e) => e.uid === uid);
  const closed = regClosed(t);
  const full = t.max && total >= t.max && !mine;
  const [name, setName] = useState('');
  const [shuf, setShuf] = useState(true);
  const seen = useRef(null);
  const prevSeen = seen.current;
  seen.current = new Set(entries.map((e) => e.uid));

  useEffect(() => { setName(mine ? mine.name : displayName || ''); }, [mine && mine.name, displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join() {
    const n = name.trim();
    if (!n) return toast('Scrie-ți numele din joc.');
    const taken = [...pre.map((p) => p.name), ...entries.filter((e) => e.uid !== uid).map((e) => e.name)]
      .some((x) => x.trim().toLowerCase() === n.toLowerCase());
    if (taken) return toast(`Numele „${n}” e deja luat. Alege altul.`);
    try {
      await setDoc(doc(db, 'tournaments', t.id, 'entries', uid), { name: n.slice(0, 40), at: (mine && mine.at) || new Date().toISOString() });
      toast(mine ? 'Nume schimbat' : 'Te-ai înscris!');
    } catch { toast('Înscrierile sunt închise pentru acest turneu.'); }
  }
  async function leave(who) {
    try { await deleteDoc(doc(db, 'tournaments', t.id, 'entries', who)); toast(who === uid ? 'Te-ai retras' : 'Participant scos'); }
    catch { toast('Nu s-a putut salva. Încearcă din nou.'); }
  }
  async function start() {
    const list = [...pre.map((p) => ({ name: p.name })), ...entries.map((e) => ({ name: e.name, uid: e.uid }))];
    const used = {};
    list.forEach((p) => {
      const base = String(p.name || '').trim() || 'Jucător';
      let n = base, i = 2;
      while (used[n.toLowerCase()]) n = `${base} (${i++})`;
      used[n.toLowerCase()] = 1;
      p.name = n;
    });
    const ce = countError(t.format, list.length, t.groups || 2, t.advance || 2);
    if (ce) return toast(ce);
    const ordered = shuf ? shuffle(list) : list;
    const participants = ordered.map((p, i) => (p.uid ? { id: 'p' + (i + 1), name: p.name, uid: p.uid } : { id: 'p' + (i + 1), name: p.name }));
    try {
      await updateDoc(doc(db, 'tournaments', t.id), { reg: 'started', participants, results: {}, startedAt: new Date().toISOString() });
      toast('Turneul a pornit!');
    } catch { toast('Nu s-a putut porni turneul. Încearcă din nou.'); }
  }

  let right;
  if (mine) {
    right = (
      <>
        <p className="joined">Ești înscris ca <b>{mine.name}</b></p>
        {!closed && (
          <>
            <label htmlFor="j-name">Schimbă numele</label>
            <div className="jrow">
              <input type="text" id="j-name" maxLength={40} value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); join(); } }} />
              <button className="btn volt" type="button" onClick={join}>Salvează</button>
            </div>
            <button className="btn quiet" type="button" onClick={() => leave(uid)}>Mă retrag din turneu</button>
          </>
        )}
      </>
    );
  } else if (closed) {
    right = <><p className="joined"><b>Înscrierile s-au închis</b></p><p>Organizatorul va porni turneul în curând.</p></>;
  } else if (full) {
    right = <><p className="joined"><b>Toate locurile sunt ocupate</b></p><p>Dacă se retrage cineva, se eliberează un loc.</p></>;
  } else {
    right = (
      <>
        <label htmlFor="j-name">Numele tău în joc</label>
        <div className="jrow">
          <input type="text" id="j-name" maxLength={40} value={name} placeholder="ex. Faker" autoComplete="off" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); join(); } }} />
          <button className="btn volt" type="button" onClick={join}>Mă înscriu</button>
        </div>
      </>
    );
  }

  const list = [...pre.map((p) => ({ name: p.name, host: true })), ...entries];
  const err = countError(t.format, total, t.groups || 2, t.advance || 2);
  return (
    <>
      <section className="join">
        <div>
          <span className="label">{closed ? 'Înscrieri închise' : 'Înscrieri deschise'}</span>
          <h2>{mine ? 'Ești în joc' : 'Intră în turneu'}</h2>
          <p>{mine ? 'Când organizatorul pornește turneul, apari în bracket și îți vezi meciurile evidențiate.' : 'Te înscrii cu un click. Bracket-ul se generează când organizatorul pornește turneul.'}</p>
        </div>
        <div className="join-r">{right}</div>
      </section>
      {canManage && (
        <section className="block">
          <div className="startbox">
            <p>{err ? err + ' Mai așteaptă înscrieri.' : `Sunt ${total} participanți. ${formatInfo(t.format, total, t.groups || 4)}`}</p>
            <label className="check"><input type="checkbox" checked={shuf} onChange={(e) => setShuf(e.target.checked)} /> Tragere la sorți</label>
            <button className="btn solid" type="button" disabled={!!err} onClick={start}>Pornește turneul →</button>
          </div>
        </section>
      )}
      <section className="block">
        <div className="bhead"><h2>Înscriși</h2><p>{loaded ? `${total} ${total === 1 ? 'participant' : 'participanți'}${t.max ? ` din ${t.max}` : ''}` : 'Se încarcă…'}</p></div>
        {list.length ? (
          <div className="entrants">
            {list.map((e, i) => (
              <div key={e.uid || 'h' + i} className={`ent ${e.uid && e.uid === uid ? 'me' : ''} ${e.uid && prevSeen && !prevSeen.has(e.uid) ? 'fresh' : ''}`}>
                <span className="s">{i + 1}</span><Avatar name={e.name} /><span className="n">{e.name}</span>
                {e.host && <span className="host">adăugat</span>}
                {canManage && e.uid && <button type="button" className="rm" aria-label={`Scoate-l pe ${e.name}`} onClick={() => leave(e.uid)}>×</button>}
              </div>
            ))}
          </div>
        ) : <p className="note">Încă nu s-a înscris nimeni. Trimite linkul pe grup.</p>}
      </section>
      {t.deadline ? <p className="note">Înscrierile se închid {fmtDate(t.deadline)}.</p> : null}
    </>
  );
}
