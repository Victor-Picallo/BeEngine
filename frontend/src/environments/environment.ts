export const environment = {
  production: true,
  apiUrl: 'https://beengine.onrender.com/api',
  /**
   * URL pública del Angular en producción (sin barra final).
   * Si está vacío, se usa window.location.origin o /auth/config.
   */
  appUrl: '',
  /** Opcional: si están vacíos, el cliente usa GET /api/auth/config */
  supabaseUrl: '',
  supabaseAnonKey: '',
};
