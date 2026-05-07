import app from './app.js';
import { PORT, NODE_ENV } from './config/env.js';

app.listen(PORT, () => {
  console.log(`\n  BeEngine API  [${NODE_ENV}]`);
  console.log(`  http://localhost:${PORT}/api/health\n`);
});
