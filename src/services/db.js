// Data layer. Everything the UI reads/writes goes through here, so swapping
// localStorage for Supabase/Firebase/REST later only touches this folder.
import { seed } from '../data/seed.js';
import { validWeekId, weekRange } from '../utils/format.js';
const KEY = 'indians-stats:v1';
let state = null; const subs = new Set();
const load = () => {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  return (state ||= seed());
};
const commit = () => { state = { ...state }; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} subs.forEach(f => f()); };
export const subscribe = f => (subs.add(f), () => subs.delete(f));
export const getDb = () => load();
export const resetDb = () => { state = seed(); commit(); };
export const exportJson = () => JSON.stringify(load(), null, 2);
const K = { pr: 'prScores', sr: 'srScores' };
const rerank = (list, wid) => {
  const rows = list.filter(r => r.weekId === wid).sort((a, b) => b.score - a.score);
  const rk = new Map(rows.map((r, i) => [r.playerId, i + 1]));
  return list.map(r => (r.weekId === wid ? { ...r, rank: rk.get(r.playerId) } : r));
};
const num = v => (v === '' || v == null ? null : Number(v));

/** Create a week (or replace it with {edit:true}). rows: [{playerId, pr, sr}]. Returns error[]; empty = saved. */
export function saveWeek(w, rows, { edit = false } = {}) {
  const db = load(), errs = [];
  if (!validWeekId(w.id)) errs.push('Invalid week ID (expected e.g. 2026-W41).');
  const exists = db.weeks.some(x => x.id === w.id);
  if (exists && !edit) errs.push(`${w.id} already exists — use Edit Week.`);
  if (w.endDate < w.startDate) errs.push('End date is before start date.');
  const seen = new Set();
  rows.forEach(r => {
    if (!db.players.some(p => p.id === r.playerId)) errs.push(`Unknown player "${r.playerId}".`);
    if (seen.has(r.playerId)) errs.push(`Duplicate entry for ${r.playerId}.`);
    seen.add(r.playerId);
    ['pr', 'sr'].forEach(k => { const v = num(r[k]); if (v != null && !(v >= 0)) errs.push(`${k.toUpperCase()} for ${r.playerId} must be a number ≥ 0.`); });
  });
  if (errs.length) return errs;
  let weeks = db.weeks.filter(x => x.id !== w.id);
  weeks.push({ id: w.id, weekNumber: Number(w.id.split('-W')[1]), startDate: w.startDate, endDate: w.endDate });
  const next = { ...db, weeks };
  ['pr', 'sr'].forEach(k => {
    let list = db[K[k]].filter(r => r.weekId !== w.id);
    rows.forEach(r => { const s = num(r[k]); if (s != null) list.push({ weekId: w.id, playerId: r.playerId, score: s, rank: 0 }); });
    next[K[k]] = rerank(list, w.id);
  });
  state = next; commit(); return [];
}

/** Parse + validate CSV without saving. Existing data is never overwritten: conflicting rows are flagged. */
export function previewCsv(text) {
  const db = load();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], fatal: 'File is empty.' };
  const head = lines[0].split(',').map(s => s.trim());
  const need = ['weekId', 'playerId', 'prScore', 'srScore'];
  const miss = need.filter(h => !head.includes(h));
  if (miss.length) return { rows: [], fatal: `Missing column(s): ${miss.join(', ')}` };
  const seen = new Set();
  const rows = lines.slice(1).map((l, i) => {
    const c = l.split(',').map(s => s.trim()), o = Object.fromEntries(head.map((h, j) => [h, c[j] ?? '']));
    const issues = [], key = o.weekId + '|' + o.playerId;
    if (!validWeekId(o.weekId)) issues.push('Invalid week ID');
    const p = db.players.find(p => p.id === o.playerId);
    if (!p) issues.push('Unknown player ID');
    if (seen.has(key)) issues.push('Duplicate row in file'); seen.add(key);
    ['prScore', 'srScore'].forEach(f => { const v = num(o[f]); if (v != null && !(v >= 0)) issues.push(`${f} must be ≥ 0`); });
    [['pr', 'prScore'], ['sr', 'srScore']].forEach(([k, f]) => { if (num(o[f]) != null && db[K[k]].some(r => r.weekId === o.weekId && r.playerId === o.playerId)) issues.push(`${k.toUpperCase()} already exists for this week`); });
    return { line: i + 2, weekId: o.weekId, playerId: o.playerId, name: p?.name || o.playerName || '?', pr: o.prScore, sr: o.srScore, issues, isNewWeek: validWeekId(o.weekId) && !db.weeks.some(w => w.id === o.weekId) };
  });
  return { rows };
}
export function commitCsv(rows) {
  const db = load(), ok = rows.filter(r => !r.issues.length), next = { ...db, weeks: [...db.weeks] };
  next.prScores = [...db.prScores]; next.srScores = [...db.srScores];
  const touched = new Set();
  ok.forEach(r => {
    if (!next.weeks.some(w => w.id === r.weekId)) next.weeks.push({ id: r.weekId, weekNumber: Number(r.weekId.split('-W')[1]), ...weekRange(r.weekId) });
    touched.add(r.weekId);
    if (num(r.pr) != null) next.prScores.push({ weekId: r.weekId, playerId: r.playerId, score: Number(r.pr), rank: 0 });
    if (num(r.sr) != null) next.srScores.push({ weekId: r.weekId, playerId: r.playerId, score: Number(r.sr), rank: 0 });
  });
  touched.forEach(w => { next.prScores = rerank(next.prScores, w); next.srScores = rerank(next.srScores, w); });
  state = next; commit(); return ok.length;
}
