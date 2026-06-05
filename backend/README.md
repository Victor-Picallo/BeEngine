# BeEngine API

API REST del backend (Node.js + Express).

## Arrancar

```bash
npm install
npm run dev      # local
npm start        # producción
```

Por defecto: `http://localhost:3000`

## Variables de entorno

Crea `backend/.env`. Lo importante:

| Variable | Para qué |
|----------|----------|
| `PORT` | Puerto (3000) |
| `FRONTEND_URL` | URL del Angular (CORS y OAuth) |
| `DATABASE_URL` / `DIRECT_URL` | Postgres (Supabase) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth y storage |
| `GROQ_API_KEY` | Asistente IA (opcional) |

El resto (Jolpica, Pulse, FIA…) tiene valores por defecto en `src/config/env.js`.

## Respuestas

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "mensaje" }
```

## Datos

- **En vivo** cuando hay API externa disponible.
- **Fallback** a Postgres si falla la red.
- Tras un GP: `npm run refresh` (sync completo) o `npm run refresh:weekend` (fin de semana).

## Base de datos

```bash
npm run db:migrate
npm run db:seed
npm run db:sync          # sync manual
npm run refresh          # todo (recomendado post-GP)
```

Health check: `GET /api/health`

## Estructura (resumen)

```
src/
├── routes/        Rutas HTTP
├── controllers/
├── services/      f1, f2, f3, motogp, shared
├── repositories/  Prisma / DB
└── config/env.js  Variables centralizadas
```

## Documentación del asistente IA

Documentación del asistente IA: [`docs/README.md`](docs/README.md)
