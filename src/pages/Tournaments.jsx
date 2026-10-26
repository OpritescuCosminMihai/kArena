import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../state/data';
import { useSession } from '../state/session';
import { FORMATS, model } from '../lib/engine';
import { Empty, Segs } from '../components/ui';
import { fmtDate, pad } from '../lib/util';

const regClosed = (t) => !!(t.deadline && Date.now() >= t.deadline);

function Row({ t, i, m }) {
  const nav = useNavigate();
  const open = t.reg === 'open';
  let middle, stat;
  if (open) {
    middle = <span className="label">{t.deadline ? (regClosed(t) ? 'Termen depășit' : 'Până ' + fmtDate(t.deadline)) : 'Fără termen'}</span>;
    stat = <><span className="crown">Înscrieri</span><span className="w">{regClosed(t) ? 'închise' : 'deschise'}</span></>;
  } else {
    middle = <><span className="label">{m.done}/{m.total} meciuri</span><Segs done={m.done} total={m.total} /></>;
    stat = m.champion
      ? <><span className="crown">Campion</span><span className="w">{m.names[m.champion]}</span></>
      : <span className="w">{m.status === 'live' ? 'În desfășurare' : 'Neînceput'}</span>;
  }
  return (
    <button className="trow" type="button" style={{ '--i': i }} onClick={() => nav('/turneu/' + t.id)}>
      <span className="idx">{pad(i + 1)}</span>
      <span style={{ minWidth: 0 }}>
        <span className="label">{t.game || 'Joc'} · {FORMATS[t.format].name}{open ? (t.max ? ` · ${t.max} locuri` : '') : ` · ${t.participants.length} echipe`}{t.ownerName ? ` · de ${t.ownerName}` : ''}</span>
        <span className="tname">{t.name}</span>
      </span>
      <span className="tprog">{middle}</span>
      <span className="tstat">{stat}</span>
      <span className="arrow" aria-hidden="true">→</span>
    </button>
  );
}

export default function Tournaments() {
  const { list, loaded, error } = useData();
  const { uid, isCreator } = useSession();
  const [params, setParams] = useSearchParams();
  if (!loaded) return <Empty>Se încarcă turneele…</Empty>;
  if (error) return <Empty title="Turneele nu se pot încărca">Reîncarcă pagina. Dacă problema continuă, ieși din cont și intră din nou.</Empty>;

  const all = list.map((t) => ({ t, m: t.reg === 'open' ? null : model(t) }));
  const groups = [
    { key: 'deschise', label: 'Deschise', note: 'Înscrierile sunt deschise. Intră și apasă „Mă înscriu”.', empty: 'Niciun turneu cu înscrieri deschise acum.',
      items: all.filter(({ t }) => t.reg === 'open') },
    { key: 'in-desfasurare', label: 'În desfășurare', empty: 'Niciun turneu în desfășurare.',
      items: all.filter(({ t, m }) => t.reg !== 'open' && !m.champion) },
    { key: 'incheiate', label: 'Încheiate', empty: 'Niciun turneu încheiat încă.',
      items: all.filter(({ t, m }) => t.reg !== 'open' && m.champion) },
    { key: 'ale-mele', label: 'Ale mele', note: 'Create de tine sau în care joci.', empty: 'Nu ai creat și nu joci încă în niciun turneu.',
      items: all.filter(({ t }) => t.ownerUid === uid || (t.participants || []).some((p) => p.uid === uid)) }
  ];
  const requested = groups.find((g) => g.key === params.get('filtru'));
  const current = requested || groups.find((g) => g.items.length) || groups[1];

  return (
    <div className="page enter">
      <header className="thead">
        <span className="label" style={{ '--i': 0 }}>{list.length} {list.length === 1 ? 'turneu' : 'turnee'}</span>
        <h1 className="ttitle" style={{ '--i': 1 }}>Turnee</h1>
      </header>
      {!list.length ? (
        <Empty title="Niciun turneu încă" action={isCreator && <Link className="btn solid" to="/creeaza">Creează primul turneu</Link>}>
          {isCreator ? 'Alege jocul și formatul, iar bracket-ul se generează singur.' : 'Când cineva creează un turneu, apare aici.'}
        </Empty>
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Filtrează turneele">
            {groups.map((g) => (
              <button key={g.key} type="button" role="tab" className="tab" aria-selected={g.key === current.key}
                onClick={() => setParams({ filtru: g.key }, { replace: true })}>
                {g.label}{g.items.length > 0 && <span className="tcount">{g.items.length}</span>}
              </button>
            ))}
          </div>
          <section className="block" role="tabpanel">
            {current.note && current.items.length > 0 && <p className="note">{current.note}</p>}
            {current.items.length
              ? <div className="rows">{current.items.map(({ t, m }, i) => <Row key={t.id} t={t} m={m} i={i} />)}</div>
              : <Empty>{current.empty}</Empty>}
          </section>
        </>
      )}
    </div>
  );
}
