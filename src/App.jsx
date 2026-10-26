import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useSession } from './state/session';
import { useToast } from './state/toast';
import { Avatar, Wordmark } from './components/ui';
import NickModal from './components/NickModal';
import Landing from './pages/Landing';
import Tournaments from './pages/Tournaments';
import Create from './pages/Create';
import Tournament from './pages/Tournament';
import Edit from './pages/Edit';
import Players from './pages/Players';
import Player from './pages/Player';
import Access from './pages/Access';
import NotFound from './pages/NotFound';

function usePendingCount(enabled) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) { setN(0); return undefined; }
    return onSnapshot(collection(db, 'requests'), (q) => setN(q.docs.filter((d) => !d.data().denied).length), () => setN(0));
  }, [enabled]);
  return n;
}

function Nav() {
  const s = useSession();
  const toast = useToast();
  const pending = usePendingCount(s.isAdmin);
  const [nick, setNick] = useState(false);
  const [asked, setAsked] = useState(false);

  // First visit as a member without a nickname: ask once.
  useEffect(() => {
    if (s.isMember && s.nickname === undefined && !asked) { setAsked(true); setNick('first'); }
  }, [s.isMember, s.nickname, asked]);

  const login = async () => {
    try { await s.signIn(); } catch { toast('Logarea cu Google nu a mers. Verifică dacă browserul blochează ferestrele pop-up.'); }
  };
  const cls = ({ isActive }) => 'navlink' + (isActive ? ' on' : '');
  return (
    <nav className="nav" aria-label="Principal">
      <Link to="/" className="mark" aria-label="kArena, pagina principală"><Wordmark /></Link>
      {s.isMember && (
        <div className="navlinks">
          <NavLink to="/turnee" className={cls}>Turnee</NavLink>
          <NavLink to="/jucatori" className={cls}>Jucători</NavLink>
          {s.isAdmin && <NavLink to="/acces" className={cls}>Acces{pending > 0 && <sup className="cnt">{pending}</sup>}</NavLink>}
        </div>
      )}
      <span className="acct">
        {s.isCreator && <Link to="/creeaza" className="btn solid">Turneu nou</Link>}
        {s.status === 'loading' ? null : s.user ? (
          <>
            <button className="nick" type="button" title={s.isMember ? 'Schimbă porecla' : 'Contul tău'}
              onClick={() => (s.isMember ? setNick('edit') : toast('Poți alege o poreclă după ce primești acces.'))}>
              <Avatar name={s.displayName || '?'} /><span>{s.displayName || 'Contul meu'}</span>
            </button>
            <button className="btn quiet" type="button" onClick={s.signOut}>Ieși</button>
          </>
        ) : (
          <button className="btn" type="button" onClick={login}>Intră cu Google</button>
        )}
      </span>
      {nick && <NickModal first={nick === 'first'} onClose={() => setNick(false)} />}
    </nav>
  );
}

function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="wrap">
      <Nav />
      <main><Outlet /></main>
      <footer className="foot"><span>kArena · turnee între prieteni</span><span>Sezon {new Date().getFullYear()}</span></footer>
    </div>
  );
}

function Loading() {
  return <div className="empty"><p>Se încarcă…</p></div>;
}

function Require({ role, children }) {
  const s = useSession();
  if (s.status === 'loading') return <Loading />;
  const ok = role === 'admin' ? s.isAdmin : role === 'creator' ? s.isCreator : s.isMember;
  if (!ok) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="turnee" element={<Require><Tournaments /></Require>} />
        <Route path="creeaza" element={<Require role="creator"><Create /></Require>} />
        <Route path="turneu/:id" element={<Require><Tournament /></Require>} />
        <Route path="turneu/:id/editeaza" element={<Require><Edit /></Require>} />
        <Route path="jucatori" element={<Require><Players /></Require>} />
        <Route path="jucatori/:key" element={<Require><Player /></Require>} />
        <Route path="acces" element={<Require role="admin"><Access /></Require>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
