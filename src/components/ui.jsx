import React, { useEffect, useState } from 'react';
import { subscribe, getDb } from '../services/db.js';
import { initials, weekLabel } from '../utils/format.js';
import { weeksDesc } from '../services/stats.js';

export function useDb() {
  const [db, set] = useState(getDb());
  useEffect(() => subscribe(() => set(getDb())), []);
  return db;
}
export const Card = ({ title, sub, right, children, className = '' }) => (
  <section className={'card ' + className}>
    {(title || right) && <div className="row"><div><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</div>{right}</div>}
    {children}
  </section>
);
export const Stat = ({ label, value, sub }) => <div className="stat"><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
export const Avatar = ({ name, big }) => <span className={'av' + (big ? ' l' : '')}>{initials(name)}</span>;
export const Status = ({ s }) => <span className={'bdg ' + s}>{s}</span>;
export const Tabs = ({ items, value, onChange }) => (
  <div className="tabs" role="tablist">{items.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>
);
export function WeekPicker({ value, onChange, label }) {
  const db = useDb(), ws = weeksDesc(db), i = ws.findIndex(w => w.id === value);
  return (
    <div className="row" style={{ gap: 6 }} aria-label={label}>
      <button className="btn g" aria-label="Older week" disabled={i >= ws.length - 1} onClick={() => onChange(ws[i + 1].id)}>←</button>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label="Select week">{ws.map(w => <option key={w.id} value={w.id}>{weekLabel(w)}</option>)}</select>
      <button className="btn g" aria-label="Newer week" disabled={i <= 0} onClick={() => onChange(ws[i - 1].id)}>→</button>
    </div>
  );
}
/** Reusable ranked list. rows: [{rank, playerId, name, status, value, sub?}] */
export function Board({ rows, onOpen, valueLabel = 'SCORE', max = true }) {
  return (
    <div className={max ? 'bd' : ''}>
      <div className="lr c4 h"><span>#</span><span>MEMBER</span><span>STATUS</span><span style={{ textAlign: 'right' }}>{valueLabel}</span></div>
      {rows.map(r => (
        <div key={r.playerId} className={'lr c4' + (onOpen ? ' link' : '')} onClick={() => onOpen?.(r.playerId)}>
          <span className={'rk' + (r.rank <= 3 ? ' t' : '')}>{r.rank}</span>
          <span className="m"><Avatar name={r.name} /><span>{r.name}</span></span>
          <Status s={r.status} /><span className="v">{r.value}</span>
        </div>
      ))}
      {!rows.length && <div className="lr sub">No data for this selection.</div>}
    </div>
  );
}
/** Dependency-free SVG line chart. series: [{data:[n|null], color, name}] */
export function Line({ series, labels, fmtY = v => v, h = 170 }) {
  const W = 320, p = 26, vals = series.flatMap(s => s.data).filter(v => v != null);
  if (!vals.length) return <div className="sub">No data yet.</div>;
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  const x = i => p + (labels.length < 2 ? (W - 2 * p) / 2 : (i * (W - 2 * p)) / (labels.length - 1));
  const y = v => h - 20 - ((v - lo) / sp) * (h - 40);
  const path = d => d.map((v, i) => (v == null ? '' : (d[i - 1] == null || i === 0 ? 'M' : 'L') + x(i) + ' ' + y(v))).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label="Trend chart">
      <defs>{series.map((s, i) => <linearGradient key={i} id={'g' + i + s.color.slice(1)} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".3" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
      {[0, 0.5, 1].map(t => <line key={t} x1={p} x2={W - p} y1={y(lo + sp * t)} y2={y(lo + sp * t)} stroke="#1c2755" />)}
      <text x="2" y={y(hi) + 3}>{fmtY(hi)}</text><text x="2" y={y(lo) + 3}>{fmtY(lo)}</text>
      {series.length === 1 && <path d={path(series[0].data) + ` L${x(labels.length - 1)} ${h - 20} L${x(0)} ${h - 20}Z`} fill={`url(#g0${series[0].color.slice(1)})`} stroke="none" />}
      {series.map((s, si) => <g key={si}><path d={path(s.data)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />{s.data.map((v, i) => v != null && <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill="#0d1533" stroke={s.color} strokeWidth="2" />)}</g>)}
      {labels.map((l, i) => <text key={i} x={x(i)} y={h - 5} textAnchor="middle">{l}</text>)}
    </svg>
  );
}
