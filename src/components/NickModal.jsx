import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Modal from './Modal';
import { useData } from '../state/data';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';

export default function NickModal({ first, onClose }) {
  const { uid, displayName, googleName } = useSession();
  const { profiles } = useData();
  const toast = useToast();
  const [name, setName] = useState(displayName || googleName || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const n = name.trim().replace(/\s+/g, ' ');
    if (!n) return setErr('Scrie o poreclă.');
    if (n.length > 30) return setErr('Maxim 30 de caractere.');
    const taken = Object.entries(profiles).some(([id, p]) => id !== uid && String(p.name || '').toLowerCase() === n.toLowerCase());
    if (taken) return setErr(`Porecla „${n}” e deja luată. Alege alta.`);
    setBusy(true);
    try {
      await setDoc(doc(db, 'profiles', uid), { name: n });
      toast('Poreclă salvată');
      onClose();
    } catch {
      setBusy(false);
      setErr('Nu s-a putut salva. Încearcă din nou.');
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="nk-title" onSubmit={save}>
      <div><span className="label">{first ? 'Bine ai venit' : 'Contul tău'}</span><h2 id="nk-title">{first ? 'Alege-ți porecla' : 'Schimbă porecla'}</h2></div>
      <div className="field">
        <label htmlFor="nk-name">Numele din joc</label>
        <input type="text" id="nk-name" className="big-input" maxLength={30} value={name} placeholder="ex. Faker" autoComplete="off" autoFocus
          onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
      </div>
      <p className="note">Apare sus în dreapta, în clasamentul de la Pick'em și se completează singur când te înscrii la un turneu.</p>
      {err && <p className="err">{err}</p>}
      <div className="actions">
        <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează'}</button>
        <button className="btn quiet" type="button" onClick={onClose}>{first ? 'Mai târziu' : 'Anulează'}</button>
      </div>
    </Modal>
  );
}
