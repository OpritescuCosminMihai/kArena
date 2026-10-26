import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from './session';
import { FORMATS } from '../lib/engine';

// Live, shared data. Only subscribed for approved members:
// the security rules refuse everyone else anyway.
export const DataContext = createContext(null);

function useCollection(path, enabled, map = (d) => ({ id: d.id, ...d.data() })) {
  const [state, setState] = useState({ docs: [], loaded: false, error: null });
  useEffect(() => {
    if (!enabled) { setState({ docs: [], loaded: false, error: null }); return undefined; }
    return onSnapshot(collection(db, path),
      (q) => setState({ docs: q.docs.map(map), loaded: true, error: null }),
      (error) => setState((s) => ({ ...s, loaded: true, error })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);
  return state;
}

const toIso = (v) => (v && v.toMillis ? new Date(v.toMillis()).toISOString() : new Date().toISOString());

export function DataProvider({ children }) {
  const { isMember } = useSession();
  const tournaments = useCollection('tournaments', isMember);
  const profiles = useCollection('profiles', isMember);
  const votes = useCollection('votes', isMember, (d) => ({ id: d.id, ...d.data(), at: toIso(d.data().at) }));
  const legacy = useCollection('picks', isMember);

  const value = useMemo(() => {
    const list = tournaments.docs
      .filter((t) => t.participants && FORMATS[t.format])
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const profileMap = {};
    profiles.docs.forEach((p) => { profileMap[p.id] = p; });
    // Merge first-version picks with server-stamped votes into one shape:
    // picks[uid].t[tid][mid] = { p, at, srv }
    const picks = {};
    legacy.docs.forEach((p) => { picks[p.id] = JSON.parse(JSON.stringify({ t: p.t || {}, name: p.name })); });
    votes.docs.forEach((v) => {
      if (!v.uid || !v.tid || !v.mid) return;
      const o = picks[v.uid] || (picks[v.uid] = { t: {} });
      o.t[v.tid] = o.t[v.tid] || {};
      o.t[v.tid][v.mid] = { p: v.p, at: v.at, srv: true };
    });
    return {
      list, loaded: tournaments.loaded, error: tournaments.error,
      profiles: profileMap, picks, votes: votes.docs
    };
  }, [tournaments, profiles, votes, legacy]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

export function useVoterName() {
  const { profiles, picks } = useData();
  const { uid, displayName } = useSession();
  return (id) => (profiles[id] && profiles[id].name) || (picks[id] && picks[id].name) || (id === uid ? displayName || 'Tu' : 'Jucător');
}
