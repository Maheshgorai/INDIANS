import { CLAN } from '../config.js';
import React, { useState } from 'react';
import { Card, Tabs, WeekPicker, Board, useDb } from '../components/ui.jsx';
import { weeksDesc, weekRows, averages, compare, player } from '../services/stats.js';
import { fmt, fmtDelta, fmtPct, pct } from '../utils/format.js';
import { boardRows } from './Overview.jsx';

const META = { pr: ['Piggy Race', 'Overall, event, recent-form and week comparison views', 'Overall Piggy Performance', 'Average lines across tracked weeks'], sr: ['Space Race', 'Lightyears, event results and recent-form views', 'Overall Space Performance', 'Average lightyears across tracked Space events'] };
export default function Race({ k, go }) {
  const db = useDb(), ws = weeksDesc(db), [tab, setTab] = useState('overall');
  const [wk, setWk] = useState(ws[0]?.id || ''), [wa, setWa] = useState(ws[1]?.id || ws[0]?.id || ''), [wb, setWb] = useState(ws[0]?.id || '');
  if (!ws.length) return <Card title="No weekly data yet" sub="Import a CSV or add a week on the Data page."><button className="btn" style={{ marginTop: 10 }} onClick={() => go('admin')}>Go to Data</button></Card>;
  const open = id => go('players/' + id), m = META[k];
  const avg = n => boardRows(db, k, averages(db, k, n).map(r => ({ ...r })));
  const cmp = compare(db, k, wa, wb);
  return (<>
    <Tabs items={[['overall', 'Overall'], ['event', 'Event'], ['last3', 'Last 3'], ['compare', 'Compare']]} value={tab} onChange={setTab} />
    {tab === 'event' && <WeekPicker value={wk} onChange={setWk} />}
    <div className="note"><b>{CLAN} metrics = Active roster only.</b> AV-2 is tracked separately and is not included in {CLAN} averages or star totals.</div>
    {tab === 'overall' && <Card title={m[2]} sub={m[3]}><Board rows={avg()} valueLabel="AVG" onOpen={open} /></Card>}
    {tab === 'last3' && <Card title="Last 3 weeks" sub="Average of the three most recent weeks"><Board rows={avg(3)} valueLabel="AVG L3" onOpen={open} /></Card>}
    {tab === 'event' && <Card title={`${m[0]} — ${wk}`} sub={`${weekRows(db, k, wk).length} players in selected week`}><Board rows={boardRows(db, k, weekRows(db, k, wk))} onOpen={open} /></Card>}
    {tab === 'compare' && <Card title="Week vs Week" sub="Change is calculated from stored weekly scores">
      <div className="g2"><WeekPicker value={wa} onChange={setWa} /><WeekPicker value={wb} onChange={setWb} /></div>
      <div className="bd"><div className="lr c5 h"><span>#</span><span>PLAYER</span><span style={{ textAlign: 'right' }}>{wa.slice(-3)}</span><span style={{ textAlign: 'right' }}>{wb.slice(-3)}</span><span style={{ textAlign: 'right' }}>CHANGE</span></div>
        {cmp.map((r, i) => <div key={r.playerId} className="lr c5 link" onClick={() => open(r.playerId)}><span className="rk">{i + 1}</span><span className="m"><span>{player(db, r.playerId).name}</span></span><span className="v">{r.a != null ? fmt(k, r.a) : '—'}</span><span className="v">{r.b != null ? fmt(k, r.b) : '—'}</span>
          <span className={'v ' + (r.change > 0 ? 'pos' : r.change < 0 ? 'neg' : '')}>{r.change == null ? '—' : fmtDelta(k, r.change)}<br /><small>{r.change == null ? '' : fmtPct(pct(r.a, r.b))}</small></span></div>)}</div>
    </Card>}
  </>);
}
