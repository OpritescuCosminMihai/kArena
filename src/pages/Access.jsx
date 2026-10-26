import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../state/data';
import { useToast } from '../state/toast';
import { Avatar } from '../components/ui';
import { fmtDate, toMs } from '../lib/util';

function useCol(path) {
  const [rows, setRows] = useState([]);
  useEffect(() => onSnapshot(collection(db, path), (q) => setRows(q.docs.map((d) => ({ uid: d.id, ...d.data() }))), () => {}), [path]);
  return rows;
}

function Person({ r, name, children }) {
  return (
    <li className="arow">
      <Avatar name={name} />
      <span className="an"><b>{name}</b><span>{r.email || ''}{r.at ? ' · ' + fmtDate(toMs(r.at)) : ''}</span></span>
      <span className="ab">{children}</span>
    </li>
  );
}

export default function Access() {
  const toast = useToast();
  const { profiles } = useData();
  const requests = useCol('requests');
  const members = useCol('members');
  const nm = (r) => (profiles[r.uid] && profiles[r.uid].name) || r.name || 'Fără nume';
  const pending = requests.filter((r) => !r.denied).sort((a, b) => toMs(b.at) - toMs(a.at));
  const denied = requests.filter((r) => r.denied);
  const mem = [...members].sort((a, b) => nm(a).localeCompare(nm(b)));

  const run = async (fn, ok) => {
    try { await fn(); if (ok) toast(ok); } catch { toast('Nu s-a putut salva. Încearcă din nou.'); }
  };
  const approve = (r, creator = false) => run(async () => {
    await setDoc(doc(db, 'members', r.uid), {
      name: String(r.name || '').slice(0, 60), email: String(r.email || '').slice(0, 120), creator, at: serverTimestamp()
    });
    await deleteDoc(doc(db, 'requests', r.uid));
  }, 'Acces aprobat');

  return (
    <div className="page enter">
      <header className="thead"><span className="label" style={{ '--i': 0 }}>Doar tu vezi pagina asta</span><h1 className="ttitle" style={{ '--i': 1 }}>Acces</h1></header>

      <section className="block">
        <div className="bhead"><h2>Cereri noi</h2><p>{pending.length ? `${pending.length} ${pending.length === 1 ? 'om așteaptă' : 'oameni așteaptă'}` : 'Nicio cerere nouă'}</p></div>
        {pending.length ? (
          <>
            <ul className="alist">
              {pending.map((r) => (
                <Person key={r.uid} r={r} name={nm(r)}>
                  <button className="btn solid" type="button" onClick={() => approve(r)}>Aprobă</button>
                  <button className="btn" type="button" onClick={() => approve(r, true)}>Aprobă + creare turnee</button>
                  <button className="btn quiet" type="button" onClick={() => run(() => updateDoc(doc(db, 'requests', r.uid), { denied: true }), 'Cerere refuzată')}>Refuză</button>
                </Person>
              ))}
            </ul>
            {pending.length > 1 && (
              <div className="actions"><button className="btn" type="button" onClick={async () => { for (const r of pending) await approve(r); }}>Aprobă toți</button></div>
            )}
          </>
        ) : <p className="note">Când cineva se loghează cu Google pe site, apare aici.</p>}
      </section>

      <section className="block">
        <div className="bhead"><h2>Membri</h2><p>{mem.length} {mem.length === 1 ? 'membru' : 'membri'} · tu ai mereu toate drepturile</p></div>
        {mem.length ? (
          <ul className="alist">
            {mem.map((r) => (
              <Person key={r.uid} r={r} name={nm(r)}>
                <span className="check small">
                  <button type="button" className="switch" role="switch" aria-checked={!!r.creator} aria-label={`${nm(r)} poate crea turnee`}
                    onClick={() => run(() => updateDoc(doc(db, 'members', r.uid), { creator: !r.creator }), r.creator ? 'Nu mai poate crea turnee' : 'Poate crea turnee')}><i /></button>
                  Poate crea turnee
                </span>
                <button className="btn quiet" type="button" onClick={() => run(() => deleteDoc(doc(db, 'members', r.uid)), 'Acces scos')}>Scoate accesul</button>
              </Person>
            ))}
          </ul>
        ) : <p className="note">Încă n-ai aprobat pe nimeni.</p>}
        <p className="note">Cei care pot crea turnee își gestionează doar turneele lor. Doar tu aprobi accesul altora.</p>
      </section>

      {denied.length > 0 && (
        <section className="block">
          <div className="bhead"><h2>Refuzați</h2></div>
          <ul className="alist">
            {denied.map((r) => (
              <Person key={r.uid} r={r} name={nm(r)}>
                <button className="btn" type="button" onClick={() => approve(r)}>Aprobă totuși</button>
                <button className="btn quiet" type="button" onClick={() => run(() => deleteDoc(doc(db, 'requests', r.uid)), 'Șters. Dacă se loghează din nou, apare iar la cereri.')}>Șterge</button>
              </Person>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
