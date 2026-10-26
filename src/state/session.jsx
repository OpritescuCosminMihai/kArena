import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

// Who is visiting and what they are allowed to do.
//   status: 'loading' | 'guest' | 'pending' | 'denied' | 'member'
export const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [member, setMember] = useState(null); // members/{uid} doc or null
  const [request, setRequest] = useState(null); // 'pending' | 'denied' | null
  const [checked, setChecked] = useState(false);
  const [nickname, setNickname] = useState(null); // undefined = none chosen yet

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u || null);
    setChecked(false);
    setIsAdmin(false);
    setMember(null);
    setRequest(null);
    setNickname(null);
  }), []);

  // Admin check + live membership for the signed-in user.
  useEffect(() => {
    if (!user) { if (user === null) setChecked(true); return undefined; }
    let alive = true;
    let unsubMember = () => {};
    let unsubRequest = () => {};
    (async () => {
      let admin = false;
      try { await getDoc(doc(db, 'config/organizer')); admin = true; } catch { admin = false; }
      if (!alive) return;
      setIsAdmin(admin);
      if (admin) { setChecked(true); return; }
      unsubMember = onSnapshot(doc(db, 'members', user.uid), (snap) => {
        setMember(snap.exists() ? snap.data() : null);
        setChecked(true);
      }, () => setChecked(true));
      // Make sure a request exists so the admin sees this person.
      try {
        const m = await getDoc(doc(db, 'members', user.uid));
        if (!m.exists()) {
          const r = await getDoc(doc(db, 'requests', user.uid));
          if (!r.exists()) {
            await setDoc(doc(db, 'requests', user.uid), {
              name: (user.displayName || '').slice(0, 60),
              email: user.email || '',
              at: serverTimestamp()
            });
          }
        }
      } catch { /* the snapshot below still reports the state */ }
      if (!alive) return;
      unsubRequest = onSnapshot(doc(db, 'requests', user.uid), (snap) => {
        setRequest(snap.exists() ? (snap.data().denied ? 'denied' : 'pending') : null);
      }, () => {});
    })();
    return () => { alive = false; unsubMember(); unsubRequest(); };
  }, [user]);

  const isMember = isAdmin || !!member;
  const isCreator = isAdmin || !!(member && member.creator);

  // Nickname (only members can read profiles).
  useEffect(() => {
    if (!user || !isMember) return undefined;
    return onSnapshot(doc(db, 'profiles', user.uid),
      (snap) => setNickname(snap.exists() ? snap.data().name : undefined),
      () => setNickname(undefined));
  }, [user, isMember]);

  const signIn = useCallback(async () => {
    try { await signInWithPopup(auth, googleProvider); return true; }
    catch (e) {
      if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return false;
      throw e;
    }
  }, []);
  const signOut = useCallback(() => fbSignOut(auth), []);

  const status = user === undefined || (user && !checked) ? 'loading'
    : !user ? 'guest'
      : isMember ? 'member'
        : request === 'denied' ? 'denied' : 'pending';

  const value = useMemo(() => ({
    user, uid: user ? user.uid : null, status, isAdmin, isMember, isCreator,
    googleName: user ? user.displayName || '' : '',
    nickname,
    displayName: nickname || (user ? user.displayName || '' : ''),
    signIn, signOut
  }), [user, status, isAdmin, isMember, isCreator, nickname, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
