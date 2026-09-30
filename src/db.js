// Data layer. Everything the UI reads/writes goes through here, so swapping
// localStorage for Supabase/Firebase/REST later only touches this folder.
import { seed } from '../data/seed.js';
import { validWeekId, weekRange, parseWeek, parseScore } from '../utils/format.js';
import { parseCsv } from '../utils/csv.js';
const KEY = 'indians-stats:v3';
let state = null; const subs = new Set();
const load = () => {
  if (state) return state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch { state = null; }
  return (state ||= seed());
};
const commit = () => { state = { ...state }; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} subs.forEach(f => f()); };
export const subscribe = f => (subs.add(f), () => subs.delete(f));
// The UI reads a *view* of the data: players marked "Left" (and their scores) are hidden and ranks are recomputed.
// The raw data keeps everything, so hiding is reversible.
let viewSrc = null, view = null;
const makeView = s => {
  const gone = new Set(s.players.filter(p => p.status === 'Left').map(p => p.id));
  if (!gone.size) return s;
  const strip = list => { let out = list.filter(r => !gone.has(r.playerId)); [...new Set(list.filter(r => gone.has(r.playerId)).map(r => r.weekId))].forEach(w => (out = rerank(out, w))); return out; };
  return { ...s, players: s.players.filter(p => !gone.has(p.id)), prScores: strip(s.prScores), srScores: strip(s.srScores), kraken: { ...s.kraken, rows: s.kraken.rows.filter(r => !gone.has(r.playerId)) } };
};
export const getDb = () => { const s = load(); if (view && viewSrc === s) return view; viewSrc = s; return (view = makeView(s)); };
export const getAllPlayers = () => load().players;
export const resetDb = () => { try { localStorage.removeItem(KEY); } catch {} state = null; };
/** Call once before first render. If this browser has no saved data, use the published public/data.json (if any). */
export async function initDb() {
  try { if (localStorage.getItem(KEY)) return; } catch {}
  try {
    const r = await fetch('data.json', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j && Array.isArray(j.players) && Array.isArray(j.weeks) && Array.isArray(j.prScores) && Array.isArray(j.srScores)) state = { ...seed(), ...j };
  } catch { /* no published data: start from the empty seed */ }
}
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
export function addPlayer(name) {
  const n = clean(name), db = load();
  if (!n) return 'Enter a name.';
  if (db.players.some(p => p.name === n)) return `"${n}" already exists.`;
  const id = 'p' + String(Math.max(0, ...db.players.map(p => Number(p.id.slice(1)) || 0)) + 1).padStart(3, '0');
  state = { ...db, players: [...db.players, { id, name: n, status: 'Active' }] }; commit(); return '';
}
export function renamePlayer(id, name) {
  const n = clean(name), db = load();
  if (!n) return 'Name cannot be empty.';
  if (db.players.some(p => p.name === n && p.id !== id)) return `"${n}" already exists.`;
  state = { ...db, players: db.players.map(p => (p.id === id ? { ...p, name: n } : p)) }; commit(); return '';
}
/** Permanently remove a player and all of their scores; affected weeks are re-ranked. */
export function deletePlayer(id) {
  const db = load(), next = { ...db, players: db.players.filter(p => p.id !== id) };
  ['prScores', 'srScores'].forEach(t => {
    const weeks = [...new Set(db[t].filter(r => r.playerId === id).map(r => r.weekId))];
    let list = db[t].filter(r => r.playerId !== id); weeks.forEach(w => (list = rerank(list, w))); next[t] = list;
  });
  next.kraken = { ...db.kraken, rows: db.kraken.rows.filter(r => r.playerId !== id) };
  state = next; commit();
}
export function setStatus(id, status) { const db = load(); state = { ...db, players: db.players.map(p => (p.id === id ? { ...p, status } : p)) }; commit(); }
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
  const hidden = new Set(db.players.filter(p => p.status === 'Left').map(p => p.id));
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
    let list = db[K[k]].filter(r => r.weekId !== w.id || hidden.has(r.playerId));
    rows.forEach(r => { const s = num(r[k]); if (s != null) list.push({ weekId: w.id, playerId: r.playerId, score: s, rank: 0 }); });
    next[K[k]] = rerank(list, w.id);
  });
  state = next; commit(); return [];
}

/**
 * Read a spreadsheet exported as CSV with columns: Week, Event (PR/SR), Player, Score.
 * Nothing is saved here. Unknown names are flagged as new players; existing scores are never overwritten.
 * mapping: { "typed name": existingPlayerId } lets the user say "this new name is really that player".
 */
export function previewCsv(text, mapping = {}) {
  const db = load(), all = parseCsv(text);
  if (!all.length) return { rows: [], fatal: 'File is empty.' };
  const head = all[0].cells.map(h => h.trim().toLowerCase());
  const col = (...n) => head.findIndex(h => n.includes(h));
  const ci = { Week: col('week', 'weekid', 'week id', 'date'), Event: col('event', 'type', 'race'), Player: col('player', 'name', 'playername', 'player name', 'member'), Score: col('score', 'points', 'value') };
  const miss = Object.entries(ci).filter(([, i]) => i < 0).map(([k]) => k);
  if (miss.length) return { rows: [], fatal: `Missing column(s): ${miss.join(', ')}. The first row must have the headers: Week, Event, Player, Score.` };
  const byName = new Map(db.players.map(p => [p.name, p.id])), seen = new Set(), news = new Set();
  const EV = { PR: 'pr', PIGGY: 'pr', 'PIGGY RACE': 'pr', SR: 'sr', SPACE: 'sr', 'SPACE RACE': 'sr' };
  const rows = all.slice(1).map(({ line, cells }) => {
    const rawWeek = clean(cells[ci.Week]), name = clean(cells[ci.Player]), ev = EV[clean(cells[ci.Event]).toUpperCase()], score = parseScore(cells[ci.Score]);
    const weekId = parseWeek(rawWeek), issues = [];
    if (!weekId) issues.push('Unrecognised week');
    if (!ev) issues.push('Event must be PR or SR');
    if (!name) issues.push('Missing player name');
    if (score == null || Number.isNaN(score)) issues.push('Score is not a number'); else if (score < 0) issues.push('Score is negative');
    const playerId = mapping[name] || byName.get(name) || null;
    if (playerId && db.players.find(p => p.id === playerId)?.status === 'Left') issues.push('Player is marked Left — restore them on the Data page first');
    if (!issues.length) {
      const key = [weekId, ev, playerId || name].join('|');
      if (seen.has(key)) issues.push('Duplicate row in file'); seen.add(key);
      if (playerId && db[K[ev]].some(r => r.weekId === weekId && r.playerId === playerId)) issues.push(`${ev.toUpperCase()} already saved for this week`);
    }
    if (name && !byName.has(name) && !issues.length) news.add(name);
    return { line, rawWeek, weekId, ev, name, score, playerId, isNewPlayer: !!name && !playerId, isNewWeek: !!weekId && !db.weeks.some(w => w.id === weekId), issues };
  });
  const lower = new Map(db.players.map(p => [p.name.toLowerCase(), p.name]));
  const similar = Object.fromEntries([...news].filter(n => lower.has(n.toLowerCase())).map(n => [n, lower.get(n.toLowerCase())]));
  return { rows, newNames: [...news], similar };
}
/** Save every valid row. New names become new players automatically. Returns counts. */
export function commitCsv(rows) {
  const db = load(), ok = rows.filter(r => !r.issues.length);
  const next = { ...db, players: [...db.players], weeks: [...db.weeks], prScores: [...db.prScores], srScores: [...db.srScores] };
  let n = Math.max(0, ...next.players.map(p => Number(p.id.slice(1)) || 0));
  const made = new Map(), touched = new Set(), newWeeks = new Set();
  ok.forEach(r => {
    let pid = r.playerId;
    if (!pid && !(pid = made.get(r.name))) { pid = 'p' + String(++n).padStart(3, '0'); made.set(r.name, pid); next.players.push({ id: pid, name: r.name, status: 'Active' }); }
    if (!next.weeks.some(w => w.id === r.weekId)) { next.weeks.push({ id: r.weekId, weekNumber: Number(r.weekId.split('-W')[1]), ...weekRange(r.weekId) }); newWeeks.add(r.weekId); }
    touched.add(r.weekId);
    next[K[r.ev]].push({ weekId: r.weekId, playerId: pid, score: r.score, rank: 0 });
  });
  touched.forEach(w => { next.prScores = rerank(next.prScores, w); next.srScores = rerank(next.srScores, w); });
  state = next; commit();
  return { rows: ok.length, players: made.size, weeks: newWeeks.size };
}
