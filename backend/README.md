# BeEngine API

REST API para el dashboard de motorsport BeEngine.

## Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Seguridad**: Helmet + CORS
- **Logging**: Morgan

## Arrancar

```bash
npm install
npm start         # producción
npm run dev       # desarrollo con --watch (Node.js nativo)
```

## Endpoints

| Método | Ruta                       | Descripción                    |
|--------|----------------------------|--------------------------------|
| GET    | `/api/health`              | Estado del servidor            |
| GET    | `/api/categories`          | Lista de categorías            |
| GET    | `/api/home/:category`      | Datos completos de la home     |
| GET    | `/api/news/:category`      | Noticias por categoría         |
| GET    | `/api/calendar/:category`  | Próximas sesiones              |
| GET    | `/api/f1/jolpica/*`        | F1 — calendario, standings, perfiles |
| GET    | `/api/f2/jolpica/*`        | F2 — FIA oficial + fallback local |
| GET    | `/api/f3/jolpica/*`        | F3 — FIA oficial + fallback local |
| GET    | `/api/motogp/pulselive/*`  | MotoGP — Pulse Live            |

**Categorías válidas**: `f1`, `f2`, `f3`, `motogp`, `moto2`, `moto3`

## Formato de respuesta

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "mensaje" }
```

## Estructura

El código de negocio se agrupa **por serie/categoría**. Lo compartido vive en `shared/`.

```
src/
├── config/
├── constants/
├── controllers/
│   ├── f1/              jolpica.controller.js, openf1.controller.js
│   ├── f2/              jolpica.controller.js
│   ├── f3/              jolpica.controller.js
│   ├── motogp/          pulselive.controller.js
│   ├── calendar.controller.js
│   ├── home.controller.js
│   ├── news.controller.js
│   └── …
├── data/
│   ├── f1/              mocks y grids F1
│   ├── f2/
│   ├── f3/
│   ├── motogp/
│   └── shared/          categories, news feeds
├── external/
│   ├── jolpica/
│   ├── openf1/
│   ├── fia/             cliente HTML (__NEXT_DATA__) F2/F3
│   └── motogp/
├── middlewares/
├── repositories/
├── routes/              f1.routes.js, f2.routes.js, …
├── services/
│   ├── f1/              jolpica, openf1, standings stores, media
│   ├── f2/
│   ├── f3/
│   ├── motogp/          pulseLive + perfiles, equipos, circuitos
│   └── shared/          calendar, home, news, fiaFeederApi, lastRaceImage
├── utils/
├── validators/
├── app.js
└── server.js
```

### Convención al añadir código

- **Solo F1** → `services/f1/`, `controllers/f1/`, `data/f1/`
- **Solo F2/F3** → carpeta de la serie (mismo patrón que ya tienen)
- **MotoGP / moto2 / moto3** → `services/motogp/` (Pulse compartido por categoría)
- **Varias series** → `services/shared/` + `data/shared/`

## Variables de entorno

Copia `backend/.env.example` → `backend/.env` y ajusta valores. Toda la API lee `src/config/env.js` (no uses `process.env` suelto en servicios).

```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

JOLPICA_F1_ENABLED=true
JOLPICA_BASE_URL=https://api.jolpi.ca/ergast/f1
OPENF1_BASE_URL=https://api.openf1.org/v1
EXTERNAL_API_TIMEOUT_MS=8000

MOTOGP_PULSELIVE_BASE_URL=https://api.motogp.pulselive.com/motogp/v1

FIA_F2_ENABLED=true
FIA_F2_BASE_URL=https://www.fiaformula2.com
FIA_F2_SEASON_ID=183

FIA_F3_ENABLED=true
FIA_F3_BASE_URL=https://www.fiaformula3.com
FIA_F3_SEASON_ID=183

# Opcional (Prisma / Supabase)
# DATABASE_URL=...
# DIRECT_URL=...
```

Al arrancar el API se imprime un resumen de config (sin contraseñas).

Datos de temporada: **API en vivo primero**, fallback **Postgres** (`source: live | db`). Tras un GP: **`npm run refresh`** (6 series, Storage completo, auditoría 100%). Fin de semana: `npm run refresh:weekend`.

**Moto (GP / 2 / 3) en directo:** Pulse Live `GET /pulselive/live-feed` (timing + clima + sectores PDF con colores + clasificación provisional + mensajes race control). Misma ruta en `/api/motogp`, `/api/moto2`, `/api/moto3`. Livetiming global solo MotoGP™; Moto2/Moto3 usan resultados + PDF por sesión. Frontend: `/motogp|moto2|moto3/calendario/:gp/:sesión` y `/motogp/live` → hub al GP activo.

**Moto / F2 / F3:** Pulse o FIA en vivo; si fallan, lectura desde Supabase (sin mocks de calendario/resultados en runtime).

**F1:** Jolpica (`JOLPICA_F1_ENABLED`) + fallback DB. Parrilla curada en `data/f1/f1*Grid2026.js` (solo seed de sync).

## PostgreSQL (Supabase + Prisma)

1. `DATABASE_URL` (pooler 6543) y `DIRECT_URL` (5432) en `backend/.env`
2. `npm run db:migrate` — migraciones (CLI usa `DIRECT_URL` vía `prisma.config.ts`)
3. `npm run db:seed` — series F1–Moto3 + temporadas 2026
4. Cliente: `src/lib/prisma.js` (`@prisma/adapter-pg` + pooler en runtime)
5. **Post-GP (todo en uno):** `npm run refresh` — sync 6 series + check `profile_meta` + noticias → circuitos → Storage → auditoría 100% → smoke DB
6. **Solo fin de semana:** `npm run refresh:weekend`
7. Comandos sueltos si hace falta: `db:sync`, `storage:upload:*`, `verify:media`, `smoke:db` (ver `package.json`)
8. **Health:** `GET /api/health` incluye `db.ok` y `lastSync` por serie
9. Lista de pendientes: `docs/TODO.md`

Variables Storage (opcional): `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=beengine-media`
