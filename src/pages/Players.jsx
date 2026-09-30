import React, { useState } from 'react';
import { Card, Stat, Avatar, Status, Line, useDb } from '../components/ui.jsx';
import { player, history, playerStats, rating, weeksAsc } from '../services/stats.js';
import { fmt, fmtAxis, shortDate } from '../utils/format.js';

export function PlayerList({ go }) {
  const db = useDb(), [q, setQ] = useState('');
  const list = db.players.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).map(p => ({ p, r: rating(db, p.id), pr: playerStats(db, 'pr', p.id), sr: playerStats(db, 'sr', p.id) })).sort((a, b) => b.r - a.r);
  return (<>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search player…" aria-label="Search player" />
    <div className="g2">{list.map(({ p, r, pr, sr }) => (
      <button key={p.id} className="card" style={{ textAlign: 'left' }} onClick={() => go('players/' + p.id)}>
        <div className="row"><b>{p.name}</b><Status s={p.status} /></div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{r.toFixed(2)}</div><div className="up">Player rating</div>
        <div className="stats" style={{ marginTop: 10 }}><Stat label="Piggy PB" value={pr ? fmt('pr', pr.highest) : '—'} /><Stat label="Space PB" value={sr ? fmt('sr', sr.highest) : '—'} /></div>
      </button>))}
      {!list.length && <div className="sub">No players match “{q}”.</div>}</div>
  </>);
}
const Hist = ({ k, h }) => (
  <table className="tbl"><thead><tr><th>WEEK</th><th>DATES</th><th>SCORE</th><th>RANK</th></tr></thead>
    <tbody>{[...h].reverse().map(({ week, row }) => <tr key={week.id}><td>Week {week.weekNumber}</td><td>{shortDate(week.startDate)}</td><td><b>{fmt(k, row.score)}</b></td><td>#{row.rank}</td></tr>)}</tbody></table>
);
export function Profile({ id, go }) {
  const db = useDb(), p = player(db, id);
  if (!p) return <Card title="Player not found"><button className="btn" onClick={() => go('players')}>Back to players</button></Card>;
  const labels = weeksAsc(db).map(w => 'W' + w.weekNumber);
  return (<>
    <div><button className="btn g" onClick={() => go('players')}>← All players</button></div>
    <Card><div className="row"><div className="row" style={{ justifyContent: 'flex-start' }}><Avatar name={p.name} big /><div><h2 style={{ fontSize: 20 }}>{p.name}</h2><Status s={p.status} /></div></div>
      <button className="btn g" onClick={() => go('trends?p=' + p.id)}>Compare in Trends</button></div>
      <div className="stats" style={{ marginTop: 12 }}><Stat label="Player rating" value={rating(db, p.id).toFixed(2)} /><Stat label="Weeks logged" value={Math.max(history(db, 'pr', p.id).length, history(db, 'sr', p.id).length)} /></div></Card>
    {['pr', 'sr'].map(k => { const h = history(db, k, p.id), s = playerStats(db, k, p.id); const tot = k === 'pr' ? 'Piggy Race' : 'Space Race';
      return (<div key={k} className="g2">
        <Card title={`${k.toUpperCase()} All-time performance`} sub={tot}>{s ? <div className="stats" style={{ marginTop: 10 }}>
          <Stat label="Total" value={fmt(k, s.total)} /><Stat label="Average" value={fmt(k, s.avg)} /><Stat label="Highest" value={fmt(k, s.highest)} /><Stat label="Best rank" value={'#' + s.bestRank} /><Stat label="Weeks" value={s.weeks} /><Stat label="Latest" value={fmt(k, s.latest)} /></div> : <div className="sub">No {k.toUpperCase()} data.</div>}</Card>
        <Card title={`${tot} history`} sub="Score by week"><Line series={[{ data: weeksAsc(db).map(w => history(db, k, p.id).find(x => x.week.id === w.id)?.row.score ?? null), color: k === 'pr' ? '#f472d0' : '#38d5ff' }]} labels={labels} fmtY={v => fmtAxis(k, v)} /><Hist k={k} h={h} /></Card>
      </div>); })}
  </>);
}
