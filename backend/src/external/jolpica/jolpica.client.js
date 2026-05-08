import { JOLPICA_BASE_URL, EXTERNAL_API_TIMEOUT_MS } from '../../config/env.js';

const get = async (path) => {
  const url = `${JOLPICA_BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Jolpica HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

export const jolpicaClient = { get };
