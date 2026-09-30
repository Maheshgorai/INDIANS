import { CLAN } from '../config.js';
import React, { useState } from 'react';
import { Card, Stat, Tabs, Line, Board, useDb } from '../components/ui.jsx';
import { weeksAsc, weeksDesc, weekRows, weeklyAvg, player, rating } from '../services/stats.js';
import { fmt, fmtAxis, fmtK, fmtSR } from '../utils/format.js';

export const boardRows = (db, k, rows) => rows.map(r => { const p = player(db, r.playerId); return { rank: r.rank, playerId: r.playerId, name: p.name, status: p.status, value: fmt(k, r.score) }; });

function Explorer({ go }) {
  const db = useDb(), [q, setQ] = useState('');
  const hit = db.players.find(p => p.name.toLowerCase() === q.trim().toLowerCase()) || db.players.find(p => p.name.toLowerCase().includes(q.trim().toLowerCase()) && q.trim());
  return (
    <Card className="hero">
      <div className="up" style={{ color: '#e5e9ff', fontSize: 15 }}>Player Explorer</div>
      <div className="sub">Jump straight to any {CLAN} or AV-2 player profile.</div>
      <input list="pl" value={q} onChange={e => setQ(e.target.value)} placeholder="Search player…" aria-label="Search player" style={{ marginTop: 10 }} onKeyDown={e => e.key === 'Enter' && hit && go('players/' + hit.id)} />
      <datalist id="pl">{db.players.map(p => <option key={p.id} value={p.name} />)}</datalist>
      <button className="btn" style={{ marginTop: 10 }} disabled={!hit} onClick={() => go('players/' + hit.id)}>Open profile</button>
    </Card>
  );
}
export default function Overview({ go }) {
  const db = useDb(), [k, setK] = useState('pr');
  const latest = weeksDesc(db)[0];
  if (!latest) return (<><Explorer go={go} /><Card title="No weekly data yet" sub="Add your first week to see rankings and trends."><button className="btn" style={{ marginTop: 10 }} onClick={() => go('admin')}>Go to Data</button></Card></>);
  const asc = weeksAsc(db).slice(-4), active = db.players.filter(p => p.status === 'Active').length;
  const prTop = weekRows(db, 'pr', latest.id)[0], srTop = weekRows(db, 'sr', latest.id)[0], kr = db.kraken.rows[0];
  const nm = r => (r ? player(db, r.playerId).name : '—');
  const trend = weeklyAvg(db, k).slice(-6);
  const top = db.players.map(p => ({ playerId: p.id, name: p.name, status: p.status, value: rating(db, p.id).toFixed(2) })).filter(r => Number(r.value) > 0).sort((a, b) => b.value - a.value).slice(0, 8).map((r, i) => ({ ...r, rank: i + 1 }));
  const name = r => player(db, r.playerId).name;
  return (<>
    <Explorer go={go} />
    <Card className="hero"><div className="up" style={{ color: '#7dd3fc' }}>{CLAN} // Command Center</div><h2 style={{ fontSize: 22, marginTop: 4 }}>Clan Intelligence Dashboard</h2><div className="sub">Live view of the current roster, Arena-era trends and event leaders.</div><div style={{ marginTop: 12 }}><span className="bdg"><i className="dot" />DATA ONLINE</span></div></Card>
    <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
      <Stat label={`Current ${CLAN} roster`} value={active} sub={`${db.players.length - active} other tracked`} />
      <Stat label="Piggy record" value={prTop ? fmtK(prTop.score) : '—'} sub={nm(prTop)} />
      <Stat label="Space record" value={srTop ? fmtSR(srTop.score) : '—'} sub={nm(srTop)} />
      <Stat label="Kraken record" value={kr ? kr.score.toLocaleString('en-US') : '—'} sub={nm(kr)} />
    </div>
    <Card title="Weekly Performance" sub={`Average per participant · ${latest.id}`} right={<div style={{ width: 130 }}><Tabs items={[['pr', 'PR'], ['sr', 'SR']]} value={k} onChange={setK} /></div>}>
      <Line series={[{ data: trend.map(t => t.value), color: k === 'pr' ? '#f472d0' : '#38d5ff' }]} labels={trend.map(t => 'W' + t.week.weekNumber)} fmtY={v => fmtAxis(k, v)} />
      <div className="scroll"><table className="tbl"><thead><tr><th />{asc.map(w => <th key={w.id}>WEEK {w.weekNumber}</th>)}</tr></thead>
        <tbody>{['pr', 'sr'].map(m => <tr key={m}><td>{m.toUpperCase()}</td>{asc.map(w => { const v = weeklyAvg(db, m).find(x => x.week.id === w.id)?.value; return <td key={w.id}>{v == null ? '—' : fmtAxis(m, v)}</td>; })}</tr>)}</tbody></table></div>
    </Card>
    <div className="g2">
      <Card title="Latest Piggy" sub={`${latest.endDate} · ${weekRows(db, 'pr', latest.id).length} tracked players`}><Board max rows={boardRows(db, 'pr', weekRows(db, 'pr', latest.id).slice(0, 6))} onOpen={id => go('players/' + id)} /></Card>
      <Card title="Latest Space" sub={`${latest.endDate} · ${weekRows(db, 'sr', latest.id).length} tracked players`}><Board max rows={boardRows(db, 'sr', weekRows(db, 'sr', latest.id).slice(0, 6))} onOpen={id => go('players/' + id)} /></Card>
    </div>
    <Card title="Top Rated Players" sub="Current roster · master rating model"><Board rows={top} valueLabel="RATING" onOpen={id => go('players/' + id)} /></Card>
  </>);
}
