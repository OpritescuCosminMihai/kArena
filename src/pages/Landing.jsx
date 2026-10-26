import { Link } from 'react-router-dom';
import { useSession } from '../state/session';
import { useData } from '../state/data';
import { useToast } from '../state/toast';
import Poster from '../components/Poster';

const FEATURES = [
  { n: 'Bracket live', d: 'Eliminare simplă sau dublă, fiecare cu fiecare, grupe cu playoff.' },
  { n: "Pick'em", d: 'Ghicește câștigătorii înainte de meci. Semifinalele și finala valorează mai mult.' },
  { n: 'Hall of Fame', d: 'Titluri, procente, serii de victorii și rivalități, adunate din toate turneele, pe fiecare joc în parte.' }
];

function AccessCard() {
  const s = useSession();
  const toast = useToast();
  const login = async () => {
    try { await s.signIn(); } catch { toast('Logarea cu Google nu a mers. Verifică dacă browserul blochează ferestrele pop-up.'); }
  };
  if (s.status === 'loading') return <div className="gatecard"><p className="note">Se verifică accesul…</p></div>;
  if (s.status === 'guest') {
    return (
      <div className="gatecard">
        <span className="label">Acces pe bază de invitație</span>
        <h2>Intră în arenă</h2>
        <p>Te loghezi cu Google, iar organizatorul îți aprobă accesul. Folosim contul doar ca să știm cine ești.</p>
        <button className="btn volt" type="button" onClick={login}>Intră cu Google</button>
      </div>
    );
  }
  if (s.status === 'pending') {
    return (
      <div className="gatecard">
        <span className="label">Cerere trimisă</span>
        <h2>Aștepți aprobarea</h2>
        <p>Organizatorul vede cererea ta. Pagina se deblochează singură în momentul în care primești acces, nu trebuie să o reîncarci.</p>
      </div>
    );
  }
  if (s.status === 'denied') {
    return (
      <div className="gatecard">
        <span className="label">Acces refuzat</span>
        <h2>Nu ai primit acces</h2>
        <p>Organizatorul nu ți-a aprobat cererea. Dacă e o greșeală, scrie-i direct.</p>
      </div>
    );
  }
  return (
    <div className="gatecard">
      <span className="label">{s.isAdmin ? 'Organizator' : s.isCreator ? 'Membru · poți crea turnee' : 'Membru'}</span>
      <h2 className="greet">Salut,<br /><span className="gname">{s.displayName || 'campionule'}</span></h2>
      <p>{s.isCreator ? 'Vezi turneele, înscrie-te sau pornește unul nou.' : 'Vezi turneele și înscrie-te la cele deschise.'}</p>
      <div className="actions">
        <Link to="/turnee" className="btn volt">Vezi turneele →</Link>
        {s.isCreator && <Link to="/creeaza" className="btn ghost-light">Turneu nou</Link>}
      </div>
    </div>
  );
}

export default function Landing() {
  const { isMember } = useSession();
  const { list } = useData();
  const games = isMember ? list.map((t) => t.game) : [];
  return (
    <div className="page landing">
      <Poster title="kArena" logo
        topLeft={`kArena · Sezon ${new Date().getFullYear()}`} topRight="Bracket · Grupe · Pick'em · Statistici" games={games}>
        <p className="tagline">Turnee între prieteni, cu bracket live, pronosticuri și clasament.</p>
      </Poster>
      <section className="landing-grid">
        <AccessCard />
        <ol className="features">
          {FEATURES.map((f) => (
            <li key={f.n}><span className="fnum" aria-hidden="true">■</span><div><h3>{f.n}</h3><p>{f.d}</p></div></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
