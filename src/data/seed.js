import { makeWeekId, weekRange } from '../utils/format.js';
const names = ['AV-HarryBallsagna','AV-WolfLegend','AV-INTEN','AV-LuckY','AV-ZolikaLoveKira','AV-Addicted','AV.Saberkong','AV-Derya','AV-Obajoba','AV-Supreeth','AV-Bubba0816','AV-BigPapi','AV-Nicefellow','AV-Abu//npjp','AV-CHEN1972','AV-Chuck','AV-8!...Bil','AV-SB','AV-Mendoria','AV#Rafa#Tun','AV-Animosity','AV-7-STAR','AV-SMILINGBANDIT','AV-J','AV-UANGELES','AV-MotherboardBeans'];
const status = { 'AV-Chuck': 'Inactive', 'AV-Mendoria': 'AV-2' };
// Deterministic sample data (no Math.random) so every render/reload is identical.
const F = [0.82, 0.9, 0.95, 1, 1.05];
export function seed() {
  const players = names.map((name, i) => ({ id: 'p' + String(i + 1).padStart(3, '0'), name, status: status[name] || 'Active' }));
  const weeks = [], prScores = [], srScores = [];
  [36, 37, 38, 39, 40].forEach((n, wi) => {
    const id = makeWeekId(2026, n);
    weeks.push({ id, weekNumber: n, ...weekRange(id) });
    const pr = [], sr = [];
    players.forEach((p, i) => {
      if (i >= 22 && wi < 2) return; // newer members
      const wob = 1 + (((i * 7 + n * 13) % 9) - 4) * 0.02;
      pr.push({ weekId: id, playerId: p.id, score: Math.round((56000 - i * 1750) * F[wi] * wob) });
      if (i % 5 !== 4 || wi > 2) sr.push({ weekId: id, playerId: p.id, score: Math.round(((740 - i * 24) * 1e9 * (wi % 2 ? 0.93 : 1) * wob) / 1e8) * 1e8 });
    });
    const rk = rows => rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
    prScores.push(...rk(pr)); srScores.push(...rk(sr));
  });
  const top = [['p003', 5967.9], ['p023', 4987.1], ['p001', 4082.8], ['p024', 3867.9], ['p014', 3497.3], ['p010', 3462.6], ['p022', 3320.7], ['p007', 3275.7], ['p025', 2992.7], ['p026', 2968.5]];
  const kraken = { month: '2026-09', trend: [['Mar', 1400], ['Apr', 1950], ['May', 2500], ['Jun', 2520], ['Jul', 2420], ['Sep', 2617.6]], rows: top.map(([playerId, score]) => ({ playerId, score })), sparks: 249208586 };
  return { players, weeks, prScores, srScores, kraken };
}
