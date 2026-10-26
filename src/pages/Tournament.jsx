import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../state/data';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { FORMATS, groupLetter, model, rrRes } from '../lib/engine';
import { confetti } from '../lib/confetti';
import { fmtDate } from '../lib/util';
import { Empty, FormatIcon, Segs, Trophy } from '../components/ui';
import Bracket from '../components/Bracket';
import MatchCard from '../components/MatchCard';
import { RoundsList, Standings, rrMatchProps } from '../components/Tables';
import ResultModal from '../components/ResultModal';
import Pickem from '../components/Pickem';
import Registration from '../components/Registration';

// Results that changed since the previous render (for the "just landed" animation).
function useFresh(t, champion) {
  const prev = useRef(null);
  const [fresh, setFresh] = useState(new Set());
  const key = t ? JSON.stringify(t.results || {}) : '';
  useEffect(() => {
    if (!t) return;
    const cur = {};
    Object.entries(t.results || {}).forEach(([k, v]) => { if (v) cur[k] = JSON.stringify(v); });
    const p = prev.current;
    if (p && p.id === t.id) {
      const f = new Set(Object.keys(cur).filter((k) => p.res[k] !== cur[k]));
      setFresh(f);
      if (champion && p.champion !== champion) confetti();
    }
    prev.current = { id: t.id, res: cur, champion };
    const timer = setTimeout(() => setFresh(new Set()), 1600);
    return () => clearTimeout(timer);
  }, [key, champion]); // eslint-disable-line react-hooks/exhaustive-deps
  return fresh;
}

export default function Tournament() {
  const { id } = useParams();
  const { list, loaded, picks } = useData();
  const { uid, isAdmin } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const t = list.find((x) => x.id === id);
  const m = useMemo(() => (t && t.reg !== 'open' ? model(t) : null), [t]);
  const fresh = useFresh(t, m && m.champion);
  const [tab, setTab] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  if (!loaded) return <Empty>Se încarcă turneul…</Empty>;
  if (!t) return <Empty title="Turneul nu există" action={<Link className="btn" to="/turnee">Vezi toate turneele</Link>}>Poate a fost șters de organizator.</Empty>;

  const canManage = t.ownerUid ? t.ownerUid === uid : isAdmin;
  const canDelete = canManage || isAdmin;

  async function remove() {
    try { await deleteDoc(doc(db, 'tournaments', t.id)); toast('Turneu șters'); nav('/turnee'); }
    catch { toast('Nu s-a putut șterge.'); }
  }
  async function copyLink() {
    const url = window.location.origin + '/turneu/' + t.id;
    try { await navigator.clipboard.writeText(url); toast('Link copiat. Trimite-l pe grup!'); } catch { toast(url); }
  }

  const topbar = (
    <div className="tbar">
      <Link className="btn quiet" to="/turnee">← Toate turneele</Link>
      <span className="acct">
        <button className="btn" type="button" onClick={copyLink}>Copiază linkul</button>
        {canManage && <Link className="btn" to={`/turneu/${t.id}/editeaza`}>Editează</Link>}
      </span>
    </div>
  );
  const deleteZone = canDelete && (
    <div className="confirm">
      {confirmDel ? (
        <>
          <span>{canManage ? 'Ștergi definitiv turneul și toate rezultatele?' : `Ștergi turneul creat de ${t.ownerName || 'alt membru'}? Ca administrator poți doar să-l ștergi.`}</span>
          <button className="btn danger solid" type="button" onClick={remove}>Da, șterge</button>
          <button className="btn quiet" type="button" onClick={() => setConfirmDel(false)}>Nu</button>
        </>
      ) : <button className="btn danger" type="button" onClick={() => setConfirmDel(true)}>Șterge turneul</button>}
    </div>
  );
  const owner = t.ownerName ? ` · organizat de ${t.ownerName}` : '';

  if (t.reg === 'open') {
    const closed = t.deadline && Date.now() >= t.deadline;
    return (
      <div className="page enter">
        {topbar}
        <header className="thead">
          <span className="label" style={{ '--i': 0 }}>{t.game || 'Joc'} · Înscrieri {closed ? 'închise' : 'deschise'}{owner}</span>
          <h1 className="ttitle" style={{ '--i': 1 }}>{t.name}</h1>
          <div className="meta" style={{ '--i': 2 }}>
            <div className="m"><span className="label">Format</span><b><FormatIcon format={t.format} />{FORMATS[t.format].name}</b></div>
            <div className="m grow"><span className="label">Închiderea înscrierilor</span><b style={{ fontSize: 24 }}>{t.deadline ? fmtDate(t.deadline) : 'Când pornește organizatorul'}</b></div>
          </div>
        </header>
        <Registration t={t} canManage={canManage} />
        {deleteZone}
      </div>
    );
  }

  // ----- a running or finished tournament -----
  const tabs = t.format === 'rr' ? [['table', 'Clasament'], ['rounds', 'Meciuri']]
    : t.format === 'groups' ? [['groups', 'Grupe'], ['playoff', 'Playoff']]
      : [['bracket', 'Bracket']];
  const myPicks = ((picks[uid] || {}).t || {})[t.id] || {};
  const todo = Object.entries(m.info).filter(([mid, i]) => i.a && i.b && !i.res && !myPicks[mid]).length;
  tabs.push(['pickem', "Pick'em", todo]);
  const cur = tab && tabs.some((x) => x[0] === tab) ? tab : tabs[0][0];

  const openResult = canManage ? (mid) => {
    if (m.info[mid] && m.info[mid].res && m.info[mid].res.wo) return;
    const elimMatch = !!(m.st && m.st.M[mid]);
    let a, b;
    if (elimMatch) { const r = m.ev(mid); if (!r.ready) return; a = r.a.id; b = r.b.id; }
    else { const inf = m.info[mid]; if (!inf) return; a = inf.a; b = inf.b; }
    setModal({ mid, a, b, elim: elimMatch });
  } : null;

  let body;
  if (cur === 'pickem') body = <Pickem m={m} canModerate={canManage} />;
  else if (t.format === 'single' || t.format === 'double') {
    body = (
      <section className="block">
        {!m.st.dbl && <div className="bhead"><h2>Bracket</h2></div>}
        <Bracket m={m} onOpen={openResult} fresh={fresh} myUid={uid} />
        {m.st.dbl && <p className="note">Cine pierde în bracket-ul câștigătorilor coboară în cel al învinșilor. Dacă finalistul venit de jos câștigă finala mare, se joacă un meci decisiv.</p>}
      </section>
    );
  } else if (t.format === 'rr') {
    body = cur === 'table'
      ? <section className="block"><Standings m={m} rows={m.table} lead /><p className="note">3 puncte pentru victorie, 1 pentru egal. La egalitate de puncte decide diferența de scor, apoi scorul marcat.</p></section>
      : <section className="block"><RoundsList m={m} rounds={m.rounds} onOpen={openResult} fresh={fresh} myUid={uid} /></section>;
  } else if (cur === 'groups') {
    body = (
      <section className="block">
        <div className="groups">
          {m.groups.map((g, gi) => {
            const all = g.rounds.flat();
            return (
              <div className="block" style={{ paddingTop: 0 }} key={gi}>
                <div className="bhead"><h2>Grupa {groupLetter(gi)}</h2><p>{g.complete ? 'Terminată' : `${all.filter((x) => rrRes(x, m.res, m.gone)).length}/${all.length} meciuri`}</p></div>
                <Standings m={m} rows={g.table} qualify={t.advance || 2} />
                <details><summary>Meciurile grupei {groupLetter(gi)}</summary>
                  <RoundsList m={m} rounds={g.rounds} tag={'Gr.' + groupLetter(gi)} onOpen={openResult} fresh={fresh} myUid={uid} />
                </details>
              </div>
            );
          })}
        </div>
        <p className="note">Primii {t.advance || 2} din fiecare grupă, deasupra liniei punctate, merg în playoff. Locurile din playoff se completează când grupa e terminată.</p>
      </section>
    );
  } else {
    body = (
      <section className="block">
        <div className="bhead"><h2>Playoff</h2><p>{(t.advance || 2) * (t.groups || 2)} echipe calificate</p></div>
        <Bracket m={m} onOpen={openResult} fresh={fresh} myUid={uid} />
      </section>
    );
  }

  const status = m.status === 'done' ? 'Încheiat' : m.status === 'live' ? 'În desfășurare' : 'Neînceput';
  return (
    <div className="page enter">
      {topbar}
      <header className="thead">
        <span className="label" style={{ '--i': 0 }}>{t.game || 'Joc'} · {status}{owner}</span>
        <h1 className="ttitle" style={{ '--i': 1 }}>{t.name}</h1>
        <div className="meta" style={{ '--i': 2 }}>
          <div className="m"><span className="label">Format</span><b><FormatIcon format={t.format} />{FORMATS[t.format].name}</b></div>
          <div className="m"><span className="label">Participanți</span><b>{t.participants.length}{t.format === 'groups' && <small> · {t.groups} grupe</small>}</b></div>
          <div className="m grow"><span className="label">Meciuri jucate</span><b style={{ fontFamily: 'var(--f-display)' }}>{m.done}<small>/{m.total}</small></b><Segs done={m.done} total={m.total} /></div>
        </div>
        {m.champion && (
          <div className="champion" style={{ '--i': 3 }}>
            <Trophy /><span className="label">Campion</span><div className="who">{m.names[m.champion]}</div>
          </div>
        )}
      </header>
      {canManage && m.playable.length > 0 && (
        <section className="block">
          <div className="bhead"><h2>De jucat acum</h2><p>{m.playable.length} {m.playable.length === 1 ? 'meci așteaptă' : 'meciuri așteaptă'} scorul. Apasă pe meci ca să-l introduci.</p></div>
          <div className="strip">
            {m.playable.slice(0, 12).map((p) => (p.kind === 'e'
              ? <MatchCard key={p.id} m={m} id={p.id} label={'#' + p.st.num[p.id]} r={p.r} onOpen={openResult} fresh={fresh.has(p.id)} myUid={uid} />
              : <MatchCard key={p.id} m={m} id={p.id} label={p.g != null ? `Gr.${groupLetter(p.g)}·${p.id.split('-')[1]}` : p.id.split('-')[0]} r={rrMatchProps(m, p.x)} onOpen={openResult} fresh={fresh.has(p.id)} myUid={uid} />))}
          </div>
        </section>
      )}
      <div className="tabs" role="tablist">
        {tabs.map(([k, l, n]) => (
          <button key={k} className="tab" type="button" role="tab" aria-selected={k === cur} onClick={() => setTab(k)}>{l}{n ? <sup>{n}</sup> : null}</button>
        ))}
      </div>
      {body}
      {deleteZone}
      {modal && <ResultModal t={t} m={m} {...modal} onClose={() => setModal(null)} toast={toast} />}
    </div>
  );
}
