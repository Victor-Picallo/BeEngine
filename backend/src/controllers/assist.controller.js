import { success, error } from '../utils/response.js';
import { assistConfigured, chatWithAssist } from '../services/assist/assistChat.service.js';
import { listSnapshots, upsertSnapshot } from '../services/assist/knowledgeSnapshot.service.js';
import { NODE_ENV } from '../config/env.js';

export const getAssistStatus = (_req, res) => {
  success(res, { configured: assistConfigured() });
};

export const postAssistChat = async (req, res) => {
  try {
    const { message, scope, history } = req.body ?? {};
    const data = await chatWithAssist({ message, scope, history });
    success(res, data);
  } catch (e) {
    error(res, e.message, e.status ?? 500);
  }
};

/** Solo desarrollo: listar snapshots. */
export const getAssistSnapshots = async (_req, res) => {
  if (NODE_ENV === 'production') {
    return error(res, 'No disponible', 404);
  }
  try {
    const data = await listSnapshots();
    success(res, data);
  } catch (e) {
    error(res, e.message, e.status ?? 500);
  }
};

/** Solo desarrollo: crear/actualizar snapshot. */
export const postAssistSnapshot = async (req, res) => {
  if (NODE_ENV === 'production') {
    return error(res, 'No disponible', 404);
  }
  try {
    const data = await upsertSnapshot(req.body ?? {});
    success(res, data, 201);
  } catch (e) {
    error(res, e.message, e.status ?? 500);
  }
};
