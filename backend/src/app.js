import express       from 'express';
import helmet        from 'helmet';
import morgan        from 'morgan';
import corsMiddleware       from './middlewares/cors.middleware.js';
import { errorHandler }    from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import apiRoutes           from './routes/index.js';

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(corsMiddleware);

// ── Logging ───────────────────────────────────────────────
app.use(morgan('dev'));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 ───────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global error handler (must be last) ───────────────────
app.use(errorHandler);

export default app;
