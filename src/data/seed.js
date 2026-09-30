// Starting data: completely empty. Players and weeks are created automatically
// when you import a CSV (Data page), or come from public/data.json when published.
export function seed() {
  return { players: [], weeks: [], prScores: [], srScores: [], kraken: { month: '', trend: [], rows: [], sparks: 0 } };
}
