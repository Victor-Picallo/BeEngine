import { pulseliveClient } from '../src/external/motogp/pulselive.client.js';
import { MOTOGP_BROADCAST_CATEGORY_UUID } from '../src/services/motogp/motogpTeams.service.js';

const raw = await pulseliveClient.get(
  `/teams?categoryUuid=${MOTOGP_BROADCAST_CATEGORY_UUID}&seasonYear=2026`,
);
const list = Array.isArray(raw) ? raw : [];
for (const t of list) {
  console.log(JSON.stringify({ name: t.name, id: t.id, picture: t.picture, bg: t.background_picture }));
}
