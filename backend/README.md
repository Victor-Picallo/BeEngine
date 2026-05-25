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

```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

# F2/F3 — sitio oficial FIA (calendario, standings, resultados feature race)
FIA_F2_ENABLED=true
FIA_F3_ENABLED=true
FIA_F2_BASE_URL=https://www.fiaformula2.com
FIA_F3_BASE_URL=https://www.fiaformula3.com
FIA_F2_SEASON_ID=183
FIA_F3_SEASON_ID=183
EXTERNAL_API_TIMEOUT_MS=3500
```

Si la FIA no responde, se sirven los datos de `data/f2/` y `data/f3/` sin mezclar con los oficiales.

## Migrar a PostgreSQL

1. Instalar `pg` o `drizzle-orm`
2. Añadir `DATABASE_URL` a `.env`
3. Reemplazar la lógica en `src/repositories/` sin tocar servicios ni controladores
