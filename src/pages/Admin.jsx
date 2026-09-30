import React, { useState } from 'react';
import { Card, Status, useDb } from '../components/ui.jsx';
import { saveWeek, previewCsv, commitCsv, resetDb, exportJson } from '../services/db.js';
import { weeksDesc, weekRows } from '../services/stats.js';
import { makeWeekId, weekRange, weekLabel } from '../utils/format.js';

function WeekForm({ initial, onDone }) {
  const db = useDb(), edit = !!initial, latest = weeksDesc(db)[0];
  const [num, setNum] = useState(initial?.weekNumber ?? latest.weekNumber + 1), [year, setYear] = useState(Number((initial?.id || latest.id).slice(0, 4)));
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
  const [pv, setPv] = useState(null), [msg, setMsg] = useState('');
  const load = async f => { if (f) { setMsg(''); setPv(previewCsv(await f.text())); } };
  const good = pv?.rows?.filter(r => !r.issues.length).length || 0;
  return (
    <Card title="Import CSV" sub="Columns: weekId,playerId,playerName,prScore,srScore">
      <input type="file" accept=".csv,text/csv" onChange={e => load(e.target.files[0])} aria-label="CSV file" style={{ marginTop: 10 }} />
      {pv?.fatal && <div className="err">⚠ {pv.fatal}</div>}
      {pv?.rows?.length > 0 && <><div className="scroll"><table className="tbl" style={{ marginTop: 10 }}><thead><tr><th>LINE</th><th>WEEK</th><th>PLAYER</th><th>PR</th><th>SR</th><th>STATUS</th></tr></thead><tbody>
        {pv.rows.map(r => <tr key={r.line}><td>{r.line}</td><td>{r.weekId}{r.isNewWeek && ' (new)'}</td><td>{r.name}</td><td>{r.pr}</td><td>{r.sr}</td><td className={r.issues.length ? 'neg' : 'pos'}>{r.issues.length ? r.issues.join('; ') : 'OK'}</td></tr>)}</tbody></table></div>
        <div className="row" style={{ marginTop: 10 }}><span className="sub">{good} of {pv.rows.length} rows valid. Invalid rows are skipped; nothing existing is overwritten.</span>
          <button className="btn" disabled={!good} onClick={() => { setMsg(`Imported ${commitCsv(pv.rows)} rows.`); setPv(null); }}>Confirm import</button></div></>}
      {msg && <div className="pos" style={{ marginTop: 8 }}>{msg}</div>}
    </Card>);
}
export default function Admin() {
  const db = useDb(), [form, setForm] = useState(null);
  if (form) return <WeekForm initial={form === 'new' ? null : form} onDone={() => setForm(null)} />;
  const dl = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' })); a.download = 'indians-stats.json'; a.click(); };
  return (<>
    <Card title="Weeks" right={<button className="btn" onClick={() => setForm('new')}>+ Add New Week</button>}>
      <div className="bd">{weeksDesc(db).map(w => <div key={w.id} className="lr" style={{ gridTemplateColumns: '1fr auto' }}><span>{weekLabel(w)}<div className="sub">{weekRows(db, 'pr', w.id).length} PR · {weekRows(db, 'sr', w.id).length} SR</div></span><button className="btn g" onClick={() => setForm(w)}>Edit</button></div>)}</div>
    </Card>
    <Import />
    <Card title="Backup"><div className="sub">Data is stored in this browser (localStorage). Export a backup regularly.</div>
      <div className="row" style={{ marginTop: 10 }}><button className="btn g" onClick={dl}>Export JSON</button><button className="btn g" onClick={() => confirm('Reset ALL data to the sample dataset?') && resetDb()}>Reset to sample</button></div></Card>
  </>);
}
