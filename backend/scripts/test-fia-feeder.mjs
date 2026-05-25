/**
 * Prueba FIA feeder (F2 y F3). Uso: node scripts/test-fia-feeder.mjs [f2|f3]
 */
const series = (process.argv[2] ?? 'f2').toLowerCase();

const modules =
  series === 'f3'
    ? await import('../src/services/f3/f3Data.service.js')
    : await import('../src/services/f2/f2Data.service.js');

const { getCalendar, getDriverStandings, getRaceResultsByRound } = modules;

const cal = await getCalendar();
const lastDone = [...cal.items].reverse().find((r) => r.resultsAvailable);
console.log(
  series.toUpperCase(),
  'calendar races',
  cal.items.length,
  'last done',
  lastDone?.round,
  lastDone?.raceName,
);

const std = await getDriverStandings();
console.log(
  'standings top3',
  std.items.slice(0, 3).map((d) => `${d.pos} ${d.driver} ${d.points}`),
);

if (lastDone) {
  const res = await getRaceResultsByRound(lastDone.round);
  console.log('winner', res.results[0]);
}
