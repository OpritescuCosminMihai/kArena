// Tournament engine: pure functions, no React and no Firebase.
// A tournament document holds participants and raw results; everything
// else (brackets, standings, champions, stats) is derived here.

export const FORMATS = {
  single: { name: 'Eliminare simplă', desc: 'Cine pierde un meci iese din turneu.' },
  double: { name: 'Eliminare dublă', desc: 'Ieși abia după a doua înfrângere.' },
  rr: { name: 'Fiecare cu fiecare', desc: 'Toți cu toți, clasament pe puncte.' },
  groups: { name: 'Grupe + playoff', desc: 'Grupe, apoi eliminare directă.' }
};

export const GAMES = [
  'Valorant', 'Counter-Strike 2', 'League of Legends', 'Dota 2', 'Rocket League', 'EA Sports FC',
  'Fortnite', 'Tekken 8', 'Street Fighter 6', 'Overwatch 2', 'Rainbow Six Siege', 'Brawl Stars'
];

export const groupLetter = (i) => String.fromCharCode(65 + i);

/* ---------- elimination brackets ---------- */

function seedOrder(size) {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    const next = [];
    for (const s of order) next.push(s, n + 1 - s);
    order = next;
  }
  return order;
}

// seeds: array of participant ids, null (empty slot) or {label} (not decided yet)
export function buildElim(seeds, double, prefix) {
  const n = seeds.length;
  let size = 2;
  while (size < n) size *= 2;
  const k = Math.log2(size);
  const order = seedOrder(size);
  const M = {}, W = [], L = [], GF = [];
  const mk = (id, br, round, a, b) => { M[id] = { id, br, round, a, b }; return id; };

  for (let r = 1; r <= k; r++) {
    const col = [];
    for (let j = 0; j < size >> r; j++) {
      const id = `${prefix}W${r}-${j}`;
      if (r === 1) mk(id, 'W', r, { t: 's', i: order[2 * j] - 1 }, { t: 's', i: order[2 * j + 1] - 1 });
      else mk(id, 'W', r, { t: 'w', m: `${prefix}W${r - 1}-${2 * j}` }, { t: 'w', m: `${prefix}W${r - 1}-${2 * j + 1}` });
      col.push(id);
    }
    W.push(col);
  }

  const isDouble = double && k >= 2;
  if (isDouble) {
    let lr = 1;
    let col = [];
    for (let j = 0; j < size / 4; j++) {
      col.push(mk(`${prefix}L1-${j}`, 'L', 1, { t: 'l', m: `${prefix}W1-${2 * j}` }, { t: 'l', m: `${prefix}W1-${2 * j + 1}` }));
    }
    L.push(col);
    for (let i = 2; i <= k; i++) {
      const cnt = size >> i;
      const prev = L[L.length - 1];
      lr++;
      col = [];
      for (let j = 0; j < cnt; j++) {
        col.push(mk(`${prefix}L${lr}-${j}`, 'L', lr, { t: 'w', m: prev[j] }, { t: 'l', m: `${prefix}W${i}-${cnt - 1 - j}` }));
      }
      L.push(col);
      if (i < k) {
        lr++;
        const merged = [];
        for (let j = 0; j < cnt / 2; j++) {
          merged.push(mk(`${prefix}L${lr}-${j}`, 'L', lr, { t: 'w', m: col[2 * j] }, { t: 'w', m: col[2 * j + 1] }));
        }
        L.push(merged);
      }
    }
    GF.push(mk(`${prefix}GF1`, 'GF', 1, { t: 'w', m: W[k - 1][0] }, { t: 'w', m: L[L.length - 1][0] }));
    GF.push(mk(`${prefix}GF2`, 'GF', 2, null, null));
    M[`${prefix}GF2`].reset = `${prefix}GF1`;
  }

  const num = {};
  let c = 0;
  [...W, ...L, GF].forEach((col) => col.forEach((id) => { num[id] = ++c; }));
  return { M, W, L, GF, seeds, k, dbl: isDouble, num };
}

// Returns ev(matchId) -> {dead} | {bye, a, b, winner} | {a, b, ready, res, winner, loser}
export function evalElim(st, results, gone = new Set()) {
  const memo = {};
  const DEAD = { dead: true };
  const slot = (src) => {
    if (src.t === 's') {
      const v = st.seeds[src.i];
      if (v == null) return DEAD;
      if (typeof v === 'string') return { id: v };
      return { label: v.label };
    }
    const r = ev(src.m);
    if (src.t === 'w') {
      if (r.dead) return DEAD;
      if (r.winner) return { id: r.winner };
      return { label: 'Câștigător #' + st.num[src.m] };
    }
    if (r.dead || r.bye) return DEAD;
    if (r.loser) return { id: r.loser };
    return { label: 'Învins #' + st.num[src.m] };
  };
  function ev(id) {
    if (memo[id]) return memo[id];
    const m = st.M[id];
    let a, b;
    if (m.reset) {
      const g = ev(m.reset);
      if (!g.winner || g.winner === g.a.id) return (memo[id] = { dead: true });
      a = { id: g.a.id };
      b = { id: g.b.id };
    } else {
      a = slot(m.a);
      b = slot(m.b);
    }
    let out;
    if (a.dead && b.dead) out = { dead: true };
    else if (a.dead || b.dead) {
      const o = a.dead ? b : a;
      out = { bye: true, a, b, winner: o.id || null };
    } else {
      out = { a, b };
      if (a.id && b.id) {
        out.ready = true;
        let r = results[id];
        if (!(r && r.a === a.id && r.b === b.id)) {
          r = null;
          const ga = gone.has(a.id), gb = gone.has(b.id);
          if (ga || gb) r = { a: a.id, b: b.id, sa: ga && !gb ? 0 : 1, sb: gb ? 0 : 1, win: true, wo: true };
        }
        if (r) {
          out.res = r;
          if (r.sa > r.sb) { out.winner = a.id; out.loser = b.id; }
          else if (r.sb > r.sa) { out.winner = b.id; out.loser = a.id; }
        }
      }
    }
    return (memo[id] = out);
  }
  return ev;
}

function elimChampion(st, ev) {
  if (st.dbl) {
    const g = ev(st.GF[0]);
    if (g.winner && g.winner === g.a.id) return g.winner;
    return ev(st.GF[1]).winner || null;
  }
  return ev(st.W[st.k - 1][0]).winner || null;
}

/* ---------- round robin ---------- */

export function rrRounds(ids, prefix) {
  let arr = ids.slice();
  if (arr.length % 2) arr.push(null);
  const n = arr.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const ms = [];
    for (let j = 0; j < n / 2; j++) {
      const a = arr[j], b = arr[n - 1 - j];
      if (a && b) ms.push({ id: `${prefix}R${r + 1}-${j}`, a, b });
    }
    rounds.push(ms);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return rounds;
}

export function rrRes(m, results, gone) {
  const r = results[m.id];
  if (r && r.a === m.a && r.b === m.b) return r;
  if (gone && (gone.has(m.a) || gone.has(m.b))) {
    const ga = gone.has(m.a), gb = gone.has(m.b);
    return { a: m.a, b: m.b, sa: ga ? 0 : 1, sb: gb ? 0 : 1, win: true, wo: true };
  }
  return null;
}

function standings(ids, rounds, results, gone) {
  const T = {};
  ids.forEach((id) => { T[id] = { id, p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pts: 0 }; });
  rounds.flat().forEach((m) => {
    const r = rrRes(m, results, gone);
    if (!r) return;
    const A = T[m.a], B = T[m.b];
    A.p++; B.p++;
    if (!r.win) { A.f += r.sa; A.a += r.sb; B.f += r.sb; B.a += r.sa; }
    if (r.sa > r.sb) { A.w++; B.l++; A.pts += 3; }
    else if (r.sb > r.sa) { B.w++; A.l++; B.pts += 3; }
    else { A.d++; B.d++; A.pts++; B.pts++; }
  });
  return Object.values(T).sort((x, y) =>
    y.pts - x.pts || (y.f - y.a) - (x.f - x.a) || y.f - x.f || ids.indexOf(x.id) - ids.indexOf(y.id));
}

/* ---------- the tournament model ---------- */

export function groupsOf(ids, G) {
  const grp = Array.from({ length: G }, () => []);
  ids.forEach((id, i) => {
    const row = Math.floor(i / G), c = i % G;
    grp[row % 2 ? G - 1 - c : c].push(id);
  });
  return grp;
}

export function model(t) {
  const participants = t.participants || [];
  const ids = participants.map((p) => p.id);
  const res = t.results || {};
  const names = {}, seed = {}, uidOf = {};
  const gone = new Set(t.out || []);
  participants.forEach((p, i) => {
    names[p.id] = p.name;
    seed[p.id] = i + 1;
    if (p.uid) uidOf[p.id] = p.uid;
  });
  const m = { t, names, seed, res, gone, uidOf, done: 0, total: 0, champion: null, playable: [] };
  const countElim = (st, ev) => Object.keys(st.M).forEach((id) => {
    const r = ev(id);
    if (r.dead || r.bye) return;
    m.total++;
    if (r.winner) m.done++;
    else if (r.ready) m.playable.push({ id, kind: 'e', r, st });
  });

  if (!ids.length) {
    m.info = {};
    m.status = 'new';
    return m;
  }

  if (t.format === 'single' || t.format === 'double') {
    m.st = buildElim(ids, t.format === 'double', '');
    m.ev = evalElim(m.st, res, gone);
    countElim(m.st, m.ev);
    m.champion = elimChampion(m.st, m.ev);
  } else if (t.format === 'rr') {
    m.rounds = rrRounds(ids, '');
    m.rounds.flat().forEach((x) => {
      m.total++;
      if (rrRes(x, res, gone)) m.done++;
      else m.playable.push({ id: x.id, kind: 'r', x });
    });
    m.table = standings(ids, m.rounds, res, gone);
    if (m.done === m.total && m.total) m.champion = m.table[0].id;
  } else {
    const G = t.groups || 2, A = t.advance || 2;
    m.groups = groupsOf(ids, G).map((g, gi) => {
      const rounds = rrRounds(g, `G${gi}-`);
      let done = 0;
      rounds.flat().forEach((x) => {
        m.total++;
        if (rrRes(x, res, gone)) { m.done++; done++; }
        else m.playable.push({ id: x.id, kind: 'r', x, g: gi });
      });
      return { ids: g, rounds, table: standings(g, rounds, res, gone), complete: done === rounds.flat().length };
    });
    const seeds = [];
    for (let p = 0; p < A; p++) {
      m.groups.forEach((g, gi) =>
        seeds.push(g.complete ? (g.table[p]?.id ?? null) : { label: `Locul ${p + 1} · Grupa ${groupLetter(gi)}` }));
    }
    m.st = buildElim(seeds, false, 'P-');
    m.ev = evalElim(m.st, res, gone);
    countElim(m.st, m.ev);
    m.champion = elimChampion(m.st, m.ev);
  }

  // Per-match info used by Pick'em and stats: who plays, the result, the weight.
  m.info = {};
  if (m.st) {
    const st = m.st;
    Object.keys(st.M).forEach((id) => {
      const r = m.ev(id);
      if (r.dead || r.bye) return;
      const mm = st.M[id];
      let w = 1, rn = 'Runda ' + mm.round;
      if (mm.br === 'GF') { w = 3; rn = mm.round > 1 ? 'Meci decisiv' : 'Finala mare'; }
      else if (mm.br === 'W') {
        const f = st.k - mm.round;
        if (f === 0) { w = st.dbl ? 2 : 3; rn = st.dbl ? 'Finala câștigătorilor' : (t.format === 'groups' ? 'Finala playoff' : 'Finala'); }
        else if (f === 1) { w = st.dbl ? 1 : 2; rn = 'Semifinale'; }
        else if (f === 2) rn = 'Sferturi';
      } else rn = 'Învinși · R' + mm.round;
      m.info[id] = { a: r.a && r.a.id, b: r.b && r.b.id, res: r.res, w, rn, label: '#' + st.num[id] };
    });
    if (st.dbl) {
      const lf = st.L[st.L.length - 1][0];
      if (m.info[lf]) { m.info[lf].w = 2; m.info[lf].rn = 'Finala învinșilor'; }
    }
  }
  const rrAll = t.format === 'rr'
    ? m.rounds.flatMap((r, i) => r.map((x) => ({ x, rn: 'Runda ' + (i + 1) })))
    : t.format === 'groups'
      ? m.groups.flatMap((g, gi) => g.rounds.flatMap((r, i) => r.map((x) => ({ x, rn: 'Grupa ' + groupLetter(gi) + ' · R' + (i + 1) }))))
      : [];
  rrAll.forEach(({ x, rn }) => { m.info[x.id] = { a: x.a, b: x.b, res: rrRes(x, res, gone), w: 1, rn, label: rn }; });

  m.status = m.champion ? 'done' : m.done ? 'live' : 'new';
  return m;
}

/* ---------- validation ---------- */

export function countError(format, n, G, A) {
  if (n < 3) return 'Turneul are nevoie de cel puțin 3 participanți.';
  if (n > 128) return 'Maxim 128 de participanți.';
  if (format === 'double' && n < 4) return 'Eliminarea dublă are nevoie de cel puțin 4 participanți.';
  if (format === 'rr' && n > 32) return 'Fiecare cu fiecare merge până la 32 de participanți. Pentru mai mulți, alege Grupe + playoff.';
  if (format === 'groups') {
    if (n < G * 2) return `Pentru ${G} grupe ai nevoie de cel puțin ${G * 2} participanți.`;
    if (A >= Math.floor(n / G)) return `Cu ${n} participanți în ${G} grupe pot avansa cel mult ${Math.floor(n / G) - 1} din fiecare grupă.`;
  }
  return '';
}

export function formatInfo(format, n, G = 4) {
  if (!n) return 'Primul de pe listă e capul de serie 1.';
  if (format === 'single' || format === 'double') {
    let P = 2;
    while (P < n) P *= 2;
    const byes = P - n;
    return `Bracket de ${P}${byes ? `; ${byes} ${byes === 1 ? 'cap de serie trece' : 'capi de serie trec'} direct în runda 2` : ''}. ${format === 'double' ? `Aproximativ ${2 * n - 2} meciuri.` : `${n - 1} meciuri.`}`;
  }
  if (format === 'rr') return `${(n * (n - 1)) / 2} meciuri în ${n % 2 ? n : n - 1} runde.`;
  return `${G} grupe a câte ${Math.floor(n / G)}${n % G ? '–' + Math.ceil(n / G) : ''} participanți.`;
}

/* ---------- placements ---------- */

export const PLACE_PTS = { 1: 10, 2: 6, 3: 4 };

export function placements(m) {
  const out = {};
  if (!m.champion) return out;
  out[m.champion] = 1;
  const lose = (id) => { const r = m.ev && m.ev(id); return r && r.loser; };
  if (m.t.format === 'rr') {
    m.table.forEach((r, i) => { if (!out[r.id]) out[r.id] = i + 1; });
    return out;
  }
  const st = m.st;
  if (st.dbl) {
    const g2 = m.ev(st.GF[1]);
    const ru = g2 && g2.loser ? g2.loser : lose(st.GF[0]);
    if (ru) out[ru] = 2;
    const third = lose(st.L[st.L.length - 1][0]);
    if (third && !out[third]) out[third] = 3;
  } else {
    const k = st.k;
    const ru = lose(st.W[k - 1][0]);
    if (ru) out[ru] = 2;
    if (k >= 2) st.W[k - 2].forEach((id) => { const l = lose(id); if (l && !out[l]) out[l] = 3; });
  }
  return out;
}

/* ---------- games ---------- */

const GAME_ALIAS = {
  lol: 'league of legends', cs2: 'counter-strike 2', 'cs 2': 'counter-strike 2', 'counter strike 2': 'counter-strike 2',
  csgo: 'counter-strike 2', 'cs:go': 'counter-strike 2', val: 'valorant', r6: 'rainbow six siege', r6s: 'rainbow six siege',
  rl: 'rocket league', fc: 'ea sports fc', fifa: 'ea sports fc', ow2: 'overwatch 2', sf6: 'street fighter 6'
};

export function gameKey(g) {
  const k = String(g || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return GAME_ALIAS[k] || k || '—';
}

export const playable = (t) => t && t.reg !== 'open' && t.participants && t.participants.length > 0;

export function gamesList(tournaments) {
  const m = new Map();
  tournaments.filter(playable).forEach((t) => {
    const k = gameKey(t.game);
    if (!m.has(k)) m.set(k, { key: k, label: GAMES.find((x) => x.toLowerCase() === k) || (t.game || 'Fără joc').trim(), n: 0 });
    m.get(k).n++;
  });
  return [...m.values()].sort((a, b) => b.n - a.n);
}

/* ---------- Pick'em ---------- */

// picks: { [uid]: { t: { [tid]: { [mid]: { p, at, srv } } } } }
export function pickStats(m, picks) {
  const tid = m.t.id, rows = [], split = {};
  for (const uid in picks) {
    const mine = ((picks[uid] || {}).t || {})[tid];
    if (!mine) continue;
    let pts = 0, ok = 0, dec = 0, cnt = 0;
    for (const mid in mine) {
      const pk = mine[mid], inf = m.info[mid];
      if (!pk || !inf || !(pk.p === inf.a || pk.p === inf.b)) continue;
      cnt++;
      const r = inf.res;
      if (!r) {
        split[mid] = split[mid] || {};
        split[mid][pk.p] = (split[mid][pk.p] || 0) + 1;
        continue;
      }
      if (r.wo || r.sa === r.sb) continue;
      if (!pk.srv && r.at && pk.at && pk.at > r.at) continue; // legacy votes cast after the result
      dec++;
      if (pk.p === (r.sa > r.sb ? r.a : r.b)) { ok++; pts += inf.w; }
    }
    if (cnt) rows.push({ uid, pts, ok, dec });
  }
  rows.sort((a, b) => b.pts - a.pts || b.ok - a.ok);
  return { rows, split };
}

/* ---------- player stats across tournaments ---------- */

export function playerStats(tournaments, profiles = {}, game = '') {
  const P = {};
  // Someone added by hand under the same name as a registered member is the same player.
  const uidByName = {};
  tournaments.forEach((t) => (t.participants || []).forEach((p) => {
    if (p.uid) uidByName[p.name.trim().toLowerCase()] = p.uid;
  }));
  Object.entries(profiles).forEach(([uid, pr]) => { if (pr && pr.name) uidByName[pr.name.trim().toLowerCase()] = uid; });
  const keyOf = (t, pid) => {
    const p = t.participants.find((x) => x.id === pid);
    if (!p) return null;
    const uid = p.uid || uidByName[p.name.trim().toLowerCase()];
    return uid ? 'u:' + uid : 'n:' + p.name.trim().toLowerCase();
  };
  const get = (k, name, uid) => P[k] || (P[k] = {
    key: k, uid: uid || null, name, tours: [], w: 0, l: 0, d: 0, titles: 0, finals: 0, pts: 0, best: null, games: [], h2h: {}
  });
  const ts = tournaments
    .filter((t) => playable(t) && (!game || gameKey(t.game) === game))
    .slice()
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  ts.forEach((t, ti) => {
    const m = model(t), pl = placements(m);
    t.participants.forEach((p) => {
      const k = keyOf(t, p.id);
      const o = get(k, p.name, k.startsWith('u:') ? k.slice(2) : null);
      o.name = p.name;
      const place = pl[p.id] || null;
      o.tours.push({ id: t.id, name: t.name, game: t.game, place, done: !!m.champion, created: t.createdAt });
      o.pts += 1 + (PLACE_PTS[place] || 0);
      if (place === 1) o.titles++;
      if (place && place <= 2) o.finals++;
      if (place && (o.best == null || place < o.best)) o.best = place;
    });
    Object.entries(m.info).forEach(([, inf], mi) => {
      const r = inf.res;
      if (!r || r.wo || !inf.a || !inf.b) return;
      const ka = keyOf(t, inf.a), kb = keyOf(t, inf.b);
      if (!ka || !kb) return;
      const A = P[ka], B = P[kb];
      const v = r.sa > r.sb ? 1 : r.sb > r.sa ? -1 : 0;
      const ord = [ti, String(r.at || ''), mi];
      const add = (X, Y, val) => {
        if (val > 0) X.w++; else if (val < 0) X.l++; else X.d++;
        X.games.push({ ord, v: val, opp: Y.key, t: t.id });
        const h = X.h2h[Y.key] || (X.h2h[Y.key] = { w: 0, l: 0, d: 0 });
        if (val > 0) h.w++; else if (val < 0) h.l++; else h.d++;
      };
      add(A, B, v);
      add(B, A, -v);
    });
  });

  const cmp = (a, b) => a.ord[0] - b.ord[0] || a.ord[1].localeCompare(b.ord[1]) || a.ord[2] - b.ord[2];
  Object.values(P).forEach((o) => {
    o.games.sort(cmp);
    o.n = o.w + o.l + o.d;
    o.pct = o.n ? Math.round((o.w / o.n) * 100) : 0;
    let cur = 0, best = 0;
    o.games.forEach((g) => { if (g.v > 0) { cur++; best = Math.max(best, cur); } else cur = 0; });
    o.streak = best;
    o.display = (o.uid && profiles[o.uid] && profiles[o.uid].name) || o.name;
  });
  const list = Object.values(P).sort((a, b) =>
    b.pts - a.pts || b.titles - a.titles || b.pct - a.pct || a.display.localeCompare(b.display));
  return { P, list, ts };
}

export function pickemOverall(tournaments, picks, game = '') {
  const tot = {};
  tournaments.filter((t) => playable(t) && (!game || gameKey(t.game) === game)).forEach((t) => {
    pickStats(model(t), picks).rows.forEach((r) => {
      const o = tot[r.uid] || (tot[r.uid] = { uid: r.uid, pts: 0, ok: 0, dec: 0 });
      o.pts += r.pts; o.ok += r.ok; o.dec += r.dec;
    });
  });
  return Object.values(tot).filter((o) => o.dec).sort((a, b) => b.pts - a.pts || b.ok - a.ok);
}
