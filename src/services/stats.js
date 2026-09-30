// All statistics are derived from the weekly score tables — nothing here is stored.
const T = { pr: 'prScores', sr: 'srScores' };
export const weeksAsc = db => [...db.weeks].sort((a, b) => (a.id < b.id ? -1 : 1));
export const weeksDesc = db => weeksAsc(db).reverse();
export const player = (db, id) => db.players.find(p => p.id === id);
export const weekRows = (db, k, wid) => db[T[k]].filter(r => r.weekId === wid).sort((a, b) => a.rank - b.rank);
export const history = (db, k, pid) => weeksAsc(db).map(week => ({ week, row: db[T[k]].find(r => r.weekId === week.id && r.playerId === pid) })).filter(x => x.row);
export function playerStats(db, k, pid) {
  const h = history(db, k, pid); if (!h.length) return null;
  const s = h.map(x => x.row.score), total = s.reduce((a, b) => a + b, 0);
  return { total, avg: total / s.length, highest: Math.max(...s), bestRank: Math.min(...h.map(x => x.row.rank)), weeks: s.length, latest: s.at(-1) };
}
export function averages(db, k, lastN) {
  const wk = weeksAsc(db).slice(lastN ? -lastN : 0).map(w => w.id), acc = {};
  db[T[k]].filter(r => wk.includes(r.weekId)).forEach(r => (acc[r.playerId] ||= []).push(r.score));
  return Object.entries(acc).map(([playerId, a]) => ({ playerId, score: a.reduce((x, y) => x + y, 0) / a.length, weeks: a.length })).sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}
export function compare(db, k, a, b) {
  const ra = Object.fromEntries(weekRows(db, k, a).map(r => [r.playerId, r.score])), rb = Object.fromEntries(weekRows(db, k, b).map(r => [r.playerId, r.score]));
  return [...new Set([...Object.keys(ra), ...Object.keys(rb)])].map(playerId => ({ playerId, a: ra[playerId], b: rb[playerId], change: ra[playerId] != null && rb[playerId] != null ? rb[playerId] - ra[playerId] : null })).sort((x, y) => (y.b ?? 0) - (x.b ?? 0));
}
export const weeklyAvg = (db, k) => weeksAsc(db).map(week => { const r = weekRows(db, k, week.id); return { week, value: r.length ? r.reduce((s, x) => s + x.score, 0) / r.length : null }; });
export function rating(db, pid) {
  const parts = ['pr', 'sr'].map(k => { const h = history(db, k, pid); return h.length ? h.reduce((s, x) => s + x.row.score / weekRows(db, k, x.week.id)[0].score, 0) / h.length : null; }).filter(v => v != null);
  return parts.length ? (6 * parts.reduce((a, b) => a + b, 0)) / parts.length : 0;
}
