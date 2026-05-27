/**
 * Supabase Storage — bucket público beengine-media.
 */
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET,
  SUPABASE_STORAGE_PUBLIC_BASE,
  SUPABASE_URL,
} from '../config/env.js';

let client = null;

export const storageConfigured = () =>
  Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_STORAGE_BUCKET);

export function getStorageClient() {
  if (!storageConfigured()) {
    throw new Error(
      'Supabase Storage no configurado: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env',
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** URL pública de un objeto en el bucket. */
export function publicStorageUrl(storagePath) {
  const base = SUPABASE_STORAGE_PUBLIC_BASE;
  if (!base) return null;
  const clean = String(storagePath ?? '')
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${SUPABASE_STORAGE_BUCKET}/`), '');
  return `${base}/${clean}`;
}

/** URL pública absoluta desde Postgres; ignora rutas locales `/...` del frontend. */
export function toPublicMediaUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return null;
  return publicStorageUrl(s);
}

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

export function mimeForFile(fileName) {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return MIME[ext] ?? 'application/octet-stream';
}

/**
 * @param {string} storagePath — ej. moto2/constructors/red-bull-ktm-ajo.jpg
 * @param {Buffer} body
 * @param {string} contentType
 */
export async function uploadFile(storagePath, body, contentType) {
  const supabase = getStorageClient();
  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, body, {
      contentType,
      upsert: true,
      cacheControl: '31536000',
    });
  if (error) throw new Error(`${storagePath}: ${error.message}`);
  return publicStorageUrl(storagePath);
}
