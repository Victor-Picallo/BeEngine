import { success } from '../utils/response.js';
import { NODE_ENV } from '../config/env.js';

export const getHealth = (_req, res) => {
  success(res, {
    status:      'ok',
    uptime:      process.uptime(),
    environment: NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
};
