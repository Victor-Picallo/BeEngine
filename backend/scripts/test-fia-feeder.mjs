import { getCalendar, getDriverStandings, getRaceResultsByRound } from '../src/services/f2/f2Data.service.js';

const cal = await getCalendar();
console.log('calendar source', cal.source, 'races', cal.items.length, 'r3', cal.items.find((r) => r.round === 3));

const std = await getDriverStandings();
console.log('standings source', std.source, 'top3', std.items.slice(0, 3).map((d) => `${d.pos} ${d.driver} ${d.points}`));

const res = await getRaceResultsByRound(3);
console.log('results source', res.source, 'winner', res.results[0]);
