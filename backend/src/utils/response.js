/**
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {number} [status]
 * @param {Record<string, string | number>} [headers] Cabeceras HTTP (p. ej. Cache-Control) antes del JSON.
 */
export const success = (res, data, status = 200, headers) => {
  if (headers && typeof headers === 'object') {
    for (const [key, val] of Object.entries(headers)) {
      if (val != null && val !== '') res.set(key, String(val));
    }
  }
  return res.status(status).json({ success: true, data });
};

export const error = (res, message, status = 500) =>
  res.status(status).json({ success: false, error: message });
