import { verifyAccessToken } from '../lib/supabaseAuth.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : '';

  if (!token) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  try {
    req.authUser = await verifyAccessToken(token);
    next();
  } catch (err) {
    const status = err.status ?? 401;
    return res.status(status).json({
      success: false,
      error: err.message || 'No autorizado',
    });
  }
}
