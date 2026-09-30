export const fmtPR = n => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
export const fmtSR = n => {
  if (n == null) return '—';
  const b = n / 1e9;
  return (b >= 100 ? b.toFixed(0) : b.toFixed(1).replace(/\.0$/, '')) + 'B';
};
export const fmt = (k, n) => (k === 'pr' ? fmtPR(n) : fmtSR(n));
export const fmtK = n => (n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
export const fmtAxis = (k, n) => (k === 'pr' ? fmtK(n) : fmtSR(n));
export const fmtDelta = (k, d) => (d > 0 ? '+' : d < 0 ? '-' : '') + fmt(k, Math.abs(d));
export const pct = (a, b) => (a ? ((b - a) / a) * 100 : null);
export const fmtPct = p => (p == null ? '—' : (p > 0 ? '+' : '') + p.toFixed(1) + '%');
const iso = d => d.toISOString().slice(0, 10);
export const makeWeekId = (y, w) => `${y}-W${String(w).padStart(2, '0')}`;
export const validWeekId = id => /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(id);
export function weekRange(id) {
  const [y, w] = id.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const mon = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 864e5 + (w - 1) * 7 * 864e5;
  return { startDate: iso(new Date(mon)), endDate: iso(new Date(mon + 6 * 864e5)) };
}
export const shortDate = s => new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const weekLabel = w => `Week ${w.weekNumber} • ${shortDate(w.startDate)} – ${shortDate(w.endDate)}`;
export const initials = n => n.replace(/^AV[-.#]/, '').slice(0, 1).toUpperCase();
