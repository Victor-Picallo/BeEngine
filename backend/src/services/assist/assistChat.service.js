import {
  ASSIST_ENABLED,
  GROQ_API_KEY,
  GROQ_MODEL,
} from '../../config/env.js';
import { selectSnapshotsForChat } from './knowledgeSnapshot.service.js';
import { buildLiveContext } from './assistLiveContext.service.js';
import { buildNewsContext } from './assistNewsContext.service.js';
import { ASSIST_MAX_SNAPSHOT_CHARS } from '../../config/env.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Eres el asistente de ayuda de BeEngine, una plataforma de motor (F1, F2, F3, MotoGP, Moto2, Moto3).

Reglas:
- Responde en el mismo idioma que use el usuario (por defecto español).
- «DATOS ACTUALES BEENGINE»: clasificaciones, líderes, calendario, última carrera (una o varias categorías). Es la única fuente válida para cifras deportivas.
- «NOTICIAS RECIENTES BEENGINE»: titulares RSS/BD; no inventes noticias fuera de esa lista.
- «DOCUMENTOS DE CONTEXTO»: uso de la app (rutas, menús, favoritos, login).
- No inventes cifras, nombres de pilotos ni titulares que no aparezcan en el contexto. Si no hay «DATOS ACTUALES» para la categoría preguntada, no uses la guía ni tu memoria: di que faltan datos.
- Si faltan datos, dilo y sugiere la ruta (ej. /f1/clasificacion, /motogp/noticias).
- Para preguntas sobre varias categorías, resume cada una con los datos del bloque.
- El usuario puede escribir con errores, sin tildes o de forma coloquial; interpreta la intención (líder, puntos, calendario, noticias).
- Sé breve y útil (párrafos cortos, listas si ayudan).`;

export function assistConfigured() {
  return ASSIST_ENABLED;
}

/**
 * @param {{ message: string, scope?: string, history?: Array<{ role: string, content: string }> }} input
 */
export async function chatWithAssist(input) {
  if (!ASSIST_ENABLED) {
    const err = new Error('Asistente no configurado (GROQ_API_KEY y DATABASE_URL)');
    err.status = 503;
    throw err;
  }

  const message = String(input.message || '').trim();
  if (!message) {
    const err = new Error('Mensaje vacío');
    err.status = 400;
    throw err;
  }
  if (message.length > 2000) {
    const err = new Error('Mensaje demasiado largo (máx. 2000 caracteres)');
    err.status = 400;
    throw err;
  }

  const history = normalizeHistory(input.history);
  const [live, news] = await Promise.all([
    buildLiveContext({ scope: input.scope, message, history }),
    buildNewsContext({ scope: input.scope, message, history }),
  ]);
  const dataChars = (live.text?.length ?? 0) + (news.text?.length ?? 0);
  const snapshotBudget = Math.max(4000, ASSIST_MAX_SNAPSHOT_CHARS - dataChars);
  const { contextText, sources: docSources } = await selectSnapshotsForChat({
    scope: input.scope,
    message,
    maxChars: snapshotBudget,
  });

  const blocks = [];
  if (live.text?.trim()) blocks.push(live.text.trim());
  if (news.text?.trim()) blocks.push(news.text.trim());
  if (contextText.trim()) {
    blocks.push(`--- DOCUMENTOS DE CONTEXTO (uso de la app) ---\n${contextText}\n--- FIN DOCUMENTOS ---`);
  }
  const contextBlock =
    blocks.length > 0 ? blocks.join('\n\n') : '--- Sin contexto disponible. ---';

  const sources = [...live.sources, ...news.sources, ...docSources];

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: contextBlock },
    ...history,
    { role: 'user', content: message },
  ];

  const reply = await callGroq(messages);

  return { reply, sources };
}

function normalizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(-10)) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    const content = String(item.content || '').trim().slice(0, 2000);
    if (!role || !content) continue;
    out.push({ role, content });
  }
  return out;
}

async function callGroq(messages) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.35,
      max_tokens: 1024,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      body?.error?.message ||
      body?.message ||
      `Groq respondió con ${res.status}`;
    const err = new Error(msg);
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const reply = body?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const err = new Error('Respuesta vacía del modelo');
    err.status = 502;
    throw err;
  }
  return reply;
}
