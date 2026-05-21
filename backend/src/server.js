import app from './app.js';
import { PORT, NODE_ENV } from './config/env.js';
import {
  warmConstructorStandingsCache,
  warmDriverStandingsCache,
} from './services/f1Jolpica.service.js';

const server = app.listen(PORT);

server.on('listening', () => {
  const addr = server.address();
  const host = typeof addr === 'object' && addr ? addr.port : PORT;
  console.log(`\n  BeEngine API  [${NODE_ENV}]`);
  console.log(`  API:    http://localhost:${host}`);
  console.log(`  Health: http://localhost:${host}/api/health\n`);
  warmConstructorStandingsCache().catch(() => {});
  warmDriverStandingsCache().catch(() => {});
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Puerto ${PORT} ya está en uso (otra instancia del API).`);
    console.error(`  En PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select OwningProcess`);
    console.error(`  Luego: Stop-Process -Id <PID> -Force`);
    console.error(`  O usa otro puerto: $env:PORT=3001; npm run dev\n`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
