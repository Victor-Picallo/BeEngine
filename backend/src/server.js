import app from './app.js';
import { PORT, NODE_ENV } from './config/env.js';
import {
  warmConstructorStandingsCache,
  warmDriverStandingsCache,
} from './services/f1Jolpica.service.js';

app.listen(PORT, () => {
  console.log(`\n  BeEngine API  [${NODE_ENV}]`);
  console.log(`  API:    http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health\n`);
  warmConstructorStandingsCache().catch(() => {});
  warmDriverStandingsCache().catch(() => {});
});
