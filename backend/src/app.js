import express       from 'express';
import compression   from 'compression';
import helmet        from 'helmet';
import morgan        from 'morgan';
import path          from 'path';
import { fileURLToPath } from 'url';
import corsMiddleware       from './middlewares/cors.middleware.js';
import { errorHandler }    from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import apiRoutes           from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const motogpTeamLogosDir = path.resolve(__dirname, '../../frontend/public/motogp/teams');
const moto2TeamLogosDir = path.resolve(__dirname, '../../frontend/public/moto2/teams');

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(compression());
app.use(corsMiddleware);

// ── Logging ───────────────────────────────────────────────
app.use(morgan('dev'));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logos MotoGP / Moto2 (el dev server de Angular no siempre sirve /public)
const teamLogoStatic = (mount, dir) =>
  app.use(
    mount,
    express.static(dir, {
      maxAge: '7d',
      fallthrough: true,
      setHeaders(res) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
      },
    }),
  );
teamLogoStatic('/motogp/teams', motogpTeamLogosDir);
teamLogoStatic('/moto2/teams', moto2TeamLogosDir);

// ── Routes ────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'BeEngine API',
      health: '/api/health',
      routes: ['/api/categories', '/api/home', '/api/news', '/api/f1', '/api/f2', '/api/f3'],
    },
  });
});

app.use('/api', apiRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global error handler (must be last) ───────────────────
app.use(errorHandler);

export default app;
