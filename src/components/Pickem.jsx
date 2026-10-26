import { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { pickStats } from '../lib/engine';
import { useData, useVoterName } from '../state/data';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { Avatar } from './ui';

export default function Pickem({ m, canModerate }) {
  const { picks, votes } = useData();
  const { uid, isAdmin } = useSession();
  const voterName = useVoterName();
  const toast = useToast();
  const [optimistic, setOptimistic] = useState({}); // mid -> pid while the write is in flight
  const [just, setJust] = useState(null);
  const [msg, setMsg] = useState('');
  const tid = m.t.id;

  const { rows, split } = pickStats(m, picks);
  const minePersisted = ((picks[uid] || {}).t || {})[tid] || {};
  const mine = { ...minePersisted };
  Object.entries(optimistic).forEach(([mid, p]) => { mine[mid] = { p, srv: true }; });
  const open = Object.entries(m.info).filter(([, i]) => i.a && i.b && !i.res);

  async function vote(mid, p) {
    if (mine[mid] && mine[mid].p === p) return;
    setOptimistic((o) => ({ ...o, [mid]: p }));
    setJust(mid);
    setMsg('');
    try {
      await setDoc(doc(db, 'votes', `${uid}_${tid}_${mid}`), { uid, tid, mid, p, at: serverTimestamp() });
    } catch {
      setMsg('Votul a fost refuzat: meciul are deja rezultat sau sesiunea ta a expirat. Reîncarcă pagina și încearcă din nou.');
    } finally {
      setOptimistic((o) => { const n = { ...o }; delete n[mid]; return n; });
    }
  }
  async function clearVotes(voter) {
    const ids = votes.filter((v) => v.uid === voter && v.tid === tid).map((v) => v.id);
    try {
      for (const id of ids) await deleteDoc(doc(db, 'votes', id));
      toast(ids.length ? 'Voturi șterse' : 'Nu are voturi noi în acest turneu');
    } catch { toast('Nu s-au putut șterge voturile.'); }
  }
  async function resetNick(voter) {
    try { await deleteDoc(doc(db, 'profiles', voter)); toast('Porecla a fost resetată.'); }
    catch { toast('Nu s-a putut reseta porecla.'); }
  }

  const history = Object.entries(minePersisted).map(([mid, pk]) => {
    const inf = m.info[mid];
    if (!inf || !inf.res || inf.res.wo || inf.res.sa === inf.res.sb || !(pk.p === inf.a || pk.p === inf.b)) return null;
    const late = !pk.srv && inf.res.at && pk.at && pk.at > inf.res.at;
    const ok = !late && pk.p === (inf.res.sa > inf.res.sb ? inf.res.a : inf.res.b);
    return (
      <li key={mid} className={ok ? 'ok' : 'bad'}>
        <span className="mk">{ok ? '✓' : '✗'}</span><span className="pn">{m.names[pk.p]}</span>
        <span className="label">{inf.label}</span><span className="pp">{ok ? '+' + inf.w : '0'}</span>
      </li>
    );
  }).filter(Boolean);

  return (
    <section className="block">
      <div className="bhead"><h2>Pick'em</h2><p>Ghicește câștigătorii înainte să se joace. 1 punct pe meci{m.st ? ', 2 în semifinale și finalele de bracket, 3 în finală' : ''}.</p></div>
      <div className="pk">
        <div className="pk-col">
          <h3>Clasament ghicitori</h3>
          {rows.length ? (
            <ol className="pk-board">
              {rows.map((r, i) => (
                <li key={r.uid} className={`pk-row ${i === 0 && r.pts ? 'lead' : ''} ${r.uid === uid ? 'me' : ''}`}>
                  <span className="pk-rank">{i + 1}</span><Avatar name={voterName(r.uid)} />
                  <span className="pk-name"><span>{voterName(r.uid)}</span>{r.uid === uid && <span className="you">tu</span>}</span>
                  <span className="pk-acc">{r.ok}/{r.dec}</span><span className="pk-pts">{r.pts}</span>
                  {(canModerate || isAdmin) && r.uid !== uid && (
                    <span className="mod">
                      {isAdmin && <button type="button" className="btn quiet" onClick={() => resetNick(r.uid)}>Resetează porecla</button>}
                      <button type="button" className="btn quiet" onClick={() => clearVotes(r.uid)}>Șterge voturile</button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : <p className="note">Încă n-a votat nimeni. Alege câștigătorii și deschizi clasamentul.</p>}
          {history.length > 0 && <><h3 style={{ marginTop: 18 }}>Pronosticurile tale</h3><ul className="pk-hist">{history}</ul></>}
        </div>
        <div className="pk-col">
          <h3>Votează acum <span className="label">{open.length} {open.length === 1 ? 'meci' : 'meciuri'}</span></h3>
          {msg && <div className="pk-msg"><p>{msg}</p></div>}
          {open.length ? (
            <div className="votes">
              {open.map(([mid, inf]) => {
                const sp = split[mid] || {};
                const tot = (sp[inf.a] || 0) + (sp[inf.b] || 0);
                const my = mine[mid] && (mine[mid].p === inf.a || mine[mid].p === inf.b) ? mine[mid].p : null;
                const pa = tot ? Math.round(((sp[inf.a] || 0) / tot) * 100) : 50;
                const side = (pid, pct) => (
                  <button type="button" className={`vside ${my === pid ? 'on' : ''}`} aria-pressed={my === pid} onClick={() => vote(mid, pid)}>
                    <Avatar name={m.names[pid]} />{my && <span className="pct">{pct}%</span>}<span className="vn">{m.names[pid]}</span>
                  </button>
                );
                return (
                  <div key={mid} className={`vote ${just === mid ? 'just' : ''}`}>
                    <div className="vhead">
                      <span className="label">{inf.label === inf.rn ? inf.rn : inf.label + ' · ' + inf.rn}</span>
                      <span className="label">{tot} {tot === 1 ? 'vot' : 'voturi'}{inf.w > 1 ? ` · ${inf.w} pct` : ''}</span>
                    </div>
                    <div className="vsides">{side(inf.a, pa)}{side(inf.b, 100 - pa)}</div>
                    {my && <div className="vbar" aria-label={`${pa}% pentru ${m.names[inf.a]}`}><i style={{ width: pa + '%' }} /></div>}
                  </div>
                );
              })}
            </div>
          ) : <p className="note">Nu e niciun meci deschis la vot acum. Revino când se stabilesc următoarele perechi.</p>}
          <p className="note">Poți schimba votul până se introduce rezultatul. Procentele celorlalți apar după ce votezi.</p>
        </div>
      </div>
    </section>
  );
}
