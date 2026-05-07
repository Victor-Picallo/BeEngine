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

**Categorías válidas**: `f1`, `motogp`, `fe`, `wrc`, `indycar`

## Formato de respuesta

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "mensaje" }
```

## Estructura

```
src/
├── config/        → variables de entorno
├── constants/     → HTTP status codes
├── controllers/   → req / res
├── data/          → mocks (reemplazable por DB)
├── middlewares/   → cors, helmet, morgan, 404, errors
├── repositories/  → acceso a datos (mock → PostgreSQL futuro)
├── routes/        → definición de rutas
├── services/      → lógica de negocio
├── utils/         → helpers (response)
├── validators/    → validación de parámetros
├── app.js         → configuración Express
└── server.js      → arranque del servidor
```

## Variables de entorno

```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

## Migrar a PostgreSQL

1. Instalar `pg` o `drizzle-orm`
2. Añadir `DATABASE_URL` a `.env`
3. Reemplazar la lógica en `src/repositories/` sin tocar servicios ni controladores
