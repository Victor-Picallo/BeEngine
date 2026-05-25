import { pulseliveClient } from '../src/external/motogp/pulselive.client.js';

const seasons = await pulseliveClient.get('/results/seasons');
const season = seasons.find((s) => s.current) || seasons[0];
const events = await pulseliveClient.get(`/results/events?seasonUuid=${season.id}`);
const ev = events.filter((e) => !e.test && e.status === 'FINISHED').pop();
console.log('event', ev?.name, ev?.id);
const cats = await pulseliveClient.get(`/results/categories?eventUuid=${ev.id}`);
const mgp = cats.find((c) => c.legacy_id === 3);
const sessions = await pulseliveClient.get(
  `/results/sessions?eventUuid=${ev.id}&categoryUuid=${mgp.id}`,
);
const sess = sessions.find((s) => s.type === 'RAC') || sessions[0];
console.log('session', sess?.type, sess?.id, sess?.status);
const detail = await pulseliveClient.get(`/results/sessions/${sess.id}`);
console.log('condition', JSON.stringify(detail.condition));
console.log('session_files keys', detail.session_files ? Object.keys(detail.session_files) : null);
if (detail.session_files) {
  for (const [k, v] of Object.entries(detail.session_files)) {
    if (typeof v === 'string' && v.includes('http')) console.log(k, v.slice(0, 140));
  }
}
