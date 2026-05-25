import {
  getCalendar,
  getDriverStandings,
  getLastRace,
  getRaceResultsByRound,
} from '../src/services/f1/jolpica.service.js';

const cal = await getCalendar();
console.log('calendar', cal.items.length, 'r7 results?', cal.items.find((r) => r.round === 7)?.resultsAvailable);

const std = await getDriverStandings();
console.log('standings top3', std.items.slice(0, 3).map((d) => `${d.pos} ${d.driver} ${d.points}`));

const last = await getLastRace();
console.log('lastRace', last.round, last.raceName, last.results?.[0]?.driver);

const res = await getRaceResultsByRound(7);
console.log('round 7', res.round, res.results.length, res.results[0]);
