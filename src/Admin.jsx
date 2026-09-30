import React, { useState } from 'react';
import { Card, Status, useDb } from '../components/ui.jsx';
import { saveWeek, previewCsv, commitCsv, resetDb, exportJson, addPlayer, renamePlayer, setStatus, deletePlayer, getAllPlayers } from '../services/db.js';
import { weeksDesc, weekRows } from '../services/stats.js';
import { makeWeekId, weekRange, weekLabel } from '../utils/format.js';

function WeekForm({ initial, onDone }) {
  const db = useDb(), edit = !!initial, latest = weeksDesc(db)[0];
  const [num, setNum] = useState(initial?.weekNumber ?? (latest ? latest.weekNumber + 1 : 1)), [year, setYear] = useState(Number((initial?.id || latest?.id || '2026-W01').slice(0, 4)));
  const id = makeWeekId(year, num), auto = weekRange(id);
  const [dates, setDates] = useState(initial ? [initial.startDate, initial.endDate] : null);
  const [start, end] = dates || [auto.startDate, auto.endDate];
  const [rows, setRows] = useState(() => {
    if (!initial) return [];
    const m = {}; ['pr', 'sr'].forEach(k => weekRows(db, k, initial.id).forEach(r => ((m[r.playerId] ||= { playerId: r.playerId })[k] = r.score)));
    return Object.values(m);
  });
  const [errs, setErrs] = useState([]);
  const upd = (i, f, v) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, [f]: v } : r)));
  const live = k => { const s = rows.filter(r => r[k] !== '' && r[k] != null && Number(r[k]) >= 0).sort((a, b) => b[k] - a[k]); return Object.fromEntries(s.map((r, i) => [r.playerId, i + 1])); };
  const rp = live('pr'), rs = live('sr'), free = db.players.filter(p => !rows.some(r => r.playerId === p.id));
  const save = () => { const e = saveWeek({ id, startDate: start, endDate: end }, rows, { edit }); setErrs(e); if (!e.length) onDone(); };
  return (
    <Card title={edit ? `Edit ${id}` : 'Add New Week'} sub="Ranks are calculated automatically from scores">
      <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', margin: '10px 0' }}>
        <label><span className="up">Year</span><input type="number" value={year} disabled={edit} onChange={e => { setYear(+e.target.value); setDates(null); }} /></label>
        <label><span className="up">Week number</span><input type="number" min="1" max="53" value={num} disabled={edit} onChange={e => { setNum(+e.target.value); setDates(null); }} /></label>
        <label><span className="up">Start</span><input type="date" value={start} onChange={e => setDates([e.target.value, end])} /></label>
        <label><span className="up">End</span><input type="date" value={end} onChange={e => setDates([start, e.target.value])} /></label>
      </div>
      <div className="scroll"><table className="tbl"><thead><tr><th>PLAYER</th><th>PR</th><th>#</th><th>SR</th><th>#</th><th /></tr></thead><tbody>
        {rows.map((r, i) => <tr key={r.playerId}><td style={{ minWidth: 110 }}>{db.players.find(p => p.id === r.playerId)?.name || r.playerId}</td>
          <td><input style={{ width: 90 }} inputMode="numeric" aria-label="PR score" value={r.pr ?? ''} onChange={e => upd(i, 'pr', e.target.value)} /></td><td>{rp[r.playerId] || '—'}</td>
          <td><input style={{ width: 120 }} inputMode="numeric" aria-label="SR score" value={r.sr ?? ''} onChange={e => upd(i, 'sr', e.target.value)} /></td><td>{rs[r.playerId] || '—'}</td>
          <td><button className="btn g" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button></td></tr>)}</tbody></table></div>
      <div className="row" style={{ margin: '10px 0' }}><select value="" onChange={e => e.target.value && setRows([...rows, { playerId: e.target.value, pr: '', sr: '' }])} aria-label="Add player"><option value="">+ Add player…</option>{free.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button className="btn g" style={{ whiteSpace: 'nowrap' }} onClick={() => setRows([...rows, ...db.players.filter(p => p.status === 'Active' && !rows.some(r => r.playerId === p.id)).map(p => ({ playerId: p.id, pr: '', sr: '' }))])}>All active</button></div>
      {errs.map((e, i) => <div key={i} className="err">⚠ {e}</div>)}
      <div className="row"><button className="btn g" onClick={onDone}>Cancel</button><button className="btn" onClick={save}>{edit ? 'Save changes' : 'Save week'}</button></div>
    </Card>);
}
function Import() {
  const db = useDb();
  const [text, setText] = useState(''), [map, setMap] = useState({}), [msg, setMsg] = useState('');
  const pv = text ? previewCsv(text, map) : null;
  const good = pv?.rows?.filter(r => !r.issues.length) || [], bad = (pv?.rows?.length || 0) - good.length;
  const creating = (pv?.newNames || []).filter(n => !map[n]).length, newWeeks = new Set(good.filter(r => r.isNewWeek).map(r => r.weekId));
  const load = async f => { if (!f) return; setMsg(''); setMap({}); setText(await f.text()); };
  const pick = (n, v) => setMap(m => ({ ...m, [n]: v || undefined }));
  return (
    <Card title="Import scores (CSV)" sub="Columns: Week, Event (PR or SR), Player, Score. New player names are added automatically.">
      <input type="file" accept=".csv,text/csv,.txt" onChange={e => { load(e.target.files[0]); e.target.value = ''; }} aria-label="CSV file" style={{ marginTop: 10 }} />
      {pv?.fatal && <div className="err">⚠ {pv.fatal}</div>}
      {pv?.rows?.length > 0 && <>
        <div className="note" style={{ marginTop: 10 }}><b>{good.length}</b> rows ready{bad > 0 && <> · <span className="neg"><b>{bad}</b> with problems (skipped)</span></>} · <b>{creating}</b> new player{creating === 1 ? '' : 's'} · <b>{newWeeks.size}</b> new week{newWeeks.size === 1 ? '' : 's'}{[...newWeeks].length > 0 && ` (${[...newWeeks].join(', ')})`}</div>
        {pv.newNames.length > 0 && <details style={{ marginTop: 10 }} open={db.players.length > 0 && pv.newNames.length <= 10}>
          <summary style={{ cursor: 'pointer' }}>Check new names ({pv.newNames.length}) — spelled differently? Match to an existing player</summary>
          {pv.newNames.map(n => <div key={n} className="row" style={{ margin: '6px 0' }}><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}{pv.similar[n] && <small className="neg"> ⚠ looks like “{pv.similar[n]}”</small>}</span>
            <select style={{ maxWidth: 190 }} value={map[n] || ''} onChange={e => pick(n, e.target.value)} aria-label={`Match ${n}`}><option value="">Create new player</option>{db.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}
        </details>}
        <div className="scroll" style={{ maxHeight: '45vh', overflow: 'auto', marginTop: 10 }}><table className="tbl"><thead><tr><th>LINE</th><th>WEEK</th><th>EVENT</th><th>PLAYER</th><th>SCORE</th><th>STATUS</th></tr></thead><tbody>
          {pv.rows.map(r => <tr key={r.line}><td>{r.line}</td><td>{r.weekId || r.rawWeek}</td><td>{r.ev?.toUpperCase() || '?'}</td><td>{r.name}{r.isNewPlayer && !r.issues.length && <span className="pos"> ●new</span>}</td><td>{Number.isFinite(r.score) ? r.score.toLocaleString('en-US') : '?'}</td><td className={r.issues.length ? 'neg' : 'pos'}>{r.issues.length ? r.issues.join('; ') : 'OK'}</td></tr>)}</tbody></table></div>
        <div className="row" style={{ marginTop: 10 }}><button className="btn g" onClick={() => { setText(''); setMap({}); }}>Cancel</button>
          <button className="btn" disabled={!good.length} onClick={() => { const r = commitCsv(pv.rows); setMsg(`Imported ${r.rows} scores · ${r.players} new players · ${r.weeks} new weeks.`); setText(''); setMap({}); }}>Confirm import</button></div>
        <div className="sub" style={{ marginTop: 6 }}>Existing scores are never overwritten. Problem rows are skipped; fix them in your sheet and upload again.</div></>}
      {msg && <div className="pos" style={{ marginTop: 8 }}>✓ {msg}</div>}
    </Card>);
}
function Players() {
  const db = useDb(), all = getAllPlayers(), [name, setName] = useState(''), [err, setErr] = useState('');
  const left = all.filter(p => p.status === 'Left').length;
  const del = p => { if (confirm(`Permanently delete ${p.name} and ALL of their scores?\n\nThis cannot be undone and re-ranks the weeks they played. To keep history, choose "Left clan (hidden)" instead.`)) deletePlayer(p.id); };
  return (
    <Card title={`Players (${all.length - left}${left ? ` + ${left} hidden` : ''})`} sub="Added automatically from imports. Someone left the clan? Set “Left clan (hidden)” to remove them from the site but keep the data, or Delete to erase them.">
      {all.length > 0 && <details style={{ marginTop: 10 }}><summary style={{ cursor: 'pointer' }}>Show / rename / remove players</summary>
        <div className="bd">{all.map(p => <div key={p.id} className="lr" style={{ gridTemplateColumns: '1fr', gap: 6, opacity: p.status === 'Left' ? 0.55 : 1 }}>
          <div className="row" style={{ justifyContent: 'flex-start' }}><span className="rk">{p.id}</span><b style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</b></div>
          <div className="row"><select style={{ flex: 1 }} value={p.status} onChange={e => setStatus(p.id, e.target.value)} aria-label={`Status of ${p.name}`}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="AV-2">AV-2</option><option value="Left">Left clan (hidden)</option></select>
            <button className="btn g" onClick={() => { const n = prompt(`New name for ${p.name}:`, p.name); if (n != null) { const e = renamePlayer(p.id, n); if (e) alert(e); } }}>Rename</button>
            <button className="btn g" style={{ color: '#fca5a5' }} onClick={() => del(p)}>Delete</button></div></div>)}</div></details>}
      <div className="row" style={{ marginTop: 10 }}><input value={name} placeholder="Add a player manually…" aria-label="New player name" onChange={e => setName(e.target.value)} /><button className="btn g" onClick={() => { const e = addPlayer(name); setErr(e); if (!e) setName(''); }}>Add</button></div>
      {err && <div className="err">⚠ {err}</div>}
    </Card>);
}
export default function Admin() {
  const db = useDb(), [form, setForm] = useState(null), [copied, setCopied] = useState(false);
  if (form) return <WeekForm initial={form === 'new' ? null : form} onDone={() => setForm(null)} />;
  const dl = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' })); a.download = 'data.json'; a.click(); };
  const copy = async () => { try { await navigator.clipboard.writeText(exportJson()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { alert('Copy failed — use Download data.json instead.'); } };
  return (<>
    <Import />
    <Card title="Weeks" sub={db.weeks.length ? '' : 'No weeks yet — import a CSV above.'} right={<button className="btn g" onClick={() => setForm('new')}>+ Add manually</button>}>
      {db.weeks.length > 0 && <div className="bd">{weeksDesc(db).map(w => <div key={w.id} className="lr" style={{ gridTemplateColumns: '1fr auto' }}><span>{weekLabel(w)}<div className="sub">{weekRows(db, 'pr', w.id).length} PR · {weekRows(db, 'sr', w.id).length} SR</div></span><button className="btn g" onClick={() => setForm(w)}>Edit</button></div>)}</div>}
    </Card>
    <Players />
    <Card title="Publish & backup" sub="Your changes are saved in THIS browser only. To show them to everyone on the public site, copy the data into the file public/data.json in your GitHub repo.">
      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', justifyContent: 'flex-start' }}><button className="btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy data JSON'}</button><button className="btn g" onClick={dl}>Download data.json</button>
        <button className="btn g" onClick={() => { if (confirm('Erase the data saved in this browser? (The published data.json, if any, will load instead.)')) { resetDb(); location.reload(); } }}>Erase local data</button></div></Card>
  </>);
}
