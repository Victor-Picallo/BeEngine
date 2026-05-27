import cors from 'cors';
import { FRONTEND_URL, NODE_ENV } from '../config/env.js';

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (origin === FRONTEND_URL) return true;

  if (NODE_ENV === 'development') {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  }

  return false;
};

export default cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
