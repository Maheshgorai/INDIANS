import { CLAN } from '../config.js';
import React, { useState } from 'react';
import { Card, Stat, Tabs, Line, Board, useDb } from '../components/ui.jsx';
import { player, history, weeksAsc, averages, rating } from '../services/stats.js';
import { fmt, fmtAxis } from '../utils/format.js';

export function Kraken({ go }) {
  const db = useDb(), [tab, setTab] = useState('sep'), kr = db.kraken;
  const rows = kr.rows.map((r, i) => ({ rank: i + 1, playerId: r.playerId, name: player(db, r.playerId).name, status: player(db, r.playerId).status, value: r.score.toLocaleString('en-US', { minimumFractionDigits: 1 }) }));
  if (!kr.rows.length) return <Card title="Kraken" sub="No Kraken data yet." />;
  const avg = kr.rows.reduce((s, r) => s + r.score, 0) / kr.rows.length;
  return (<>
    <Tabs items={[['sep', 'September'], ['l3', 'Last 3'], ['pb', 'PBs']]} value={tab} onChange={setTab} />
    <div className="sub">Kraken data · current {CLAN} / AV-2 roster</div>
    <div className="stats"><Stat label="Top-10 avg" value={avg.toFixed(1)} sub={`${kr.rows.length} players with scores`} /><Stat label="September leader" value={kr.rows[0].score.toLocaleString()} sub={rows[0].name} /><Stat label="Tracked sparks" value={kr.sparks.toLocaleString()} sub="since February" /></div>
    <Card title="Clan Kraken Trend" sub="Average damage score per participant"><Line series={[{ data: kr.trend.map(t => t[1]), color: '#fb923c' }]} labels={kr.trend.map(t => t[0])} /></Card>
    <Card title="September Top 10" sub="Current roster"><Board rows={rows} onOpen={id => go('players/' + id)} max={false} /></Card>
  </>);
}
export function Records({ go }) {
  const db = useDb(), k = 'pr';
  const rows = db.players.map(p => ({ p, best: Math.max(0, ...history(db, k, p.id).map(x => x.row.score)) })).filter(x => x.best).sort((a, b) => b.best - a.best)
    .map((x, i) => ({ rank: i + 1, playerId: x.p.id, name: x.p.name, status: x.p.status, value: fmt(k, x.best) }));
  return <Card title="Piggy Records" sub="Highest weekly score per player, all time"><Board rows={rows} valueLabel="RECORD" onOpen={id => go('players/' + id)} /></Card>;
}
export function Ratings({ go }) {
  const db = useDb(), rows = db.players.map(p => ({ playerId: p.id, name: p.name, status: p.status, v: rating(db, p.id) })).sort((a, b) => b.v - a.v).map((r, i) => ({ ...r, rank: i + 1, value: r.v.toFixed(2) }));
  return <Card title="Player Ratings" sub="PB score + average score, relative to each week's leader"><Board rows={rows} valueLabel="RATING" onOpen={id => go('players/' + id)} /></Card>;
}
export function Trends({ params }) {
  const db = useDb(), [a, setA] = useState(params.get('p') || db.players[0]?.id || ''), [b, setB] = useState(db.players[1]?.id || db.players[0]?.id || '');
  if (!db.players.length) return <Card title="No players yet" sub="Import a CSV on the Data page first." />;
  const ws = weeksAsc(db), sel = v => ({ data: ws.map(w => history(db, v.k, v.id).find(x => x.week.id === w.id)?.row.score ?? null) });
  const Pick = ({ v, set }) => <select value={v} onChange={e => set(e.target.value)} aria-label="Player">{db.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>;
  return (<>
    <Card title="Compare players"><div className="g2"><Pick v={a} set={setA} /><Pick v={b} set={setB} /></div>
      <div className="row" style={{ justifyContent: 'flex-start', marginTop: 8 }}><span className="sub" style={{ color: '#4c8dff' }}>● {player(db, a)?.name}</span><span className="sub" style={{ color: '#f472d0' }}>● {player(db, b)?.name}</span></div></Card>
    {['pr', 'sr'].map(k => <Card key={k} title={k === 'pr' ? 'Piggy Race' : 'Space Race'} sub="Score by week"><Line labels={ws.map(w => 'W' + w.weekNumber)} fmtY={v => fmtAxis(k, v)} series={[{ ...sel({ k, id: a }), color: '#4c8dff' }, { ...sel({ k, id: b }), color: '#f472d0' }]} /></Card>)}
  </>);
}
