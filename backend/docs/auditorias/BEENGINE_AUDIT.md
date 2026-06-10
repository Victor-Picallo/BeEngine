# BeEngine — Auditoría técnica completa

## 1. Qué es BeEngine
BeEngine es un hub web de motorsport que reúne datos de seis series: F1, F2, F3, MotoGP, Moto2 y Moto3.

Ofrece:
- calendarios y horarios
- clasificaciones de pilotos y equipos
- perfiles de pilotos
- noticias y feed de actualidad
- un asistente IA integrado
- rutas de aplicación por serie y secciones dedicadas

El objetivo es presentar un producto global de motorsport con datos reales y capacidades de búsqueda/consulta avanzada.

## 2. Arquitectura general

### 2.1. Estructura del repositorio

```
BeEngine/
├── backend/    # API REST y sincronización
└── frontend/   # Aplicación Angular
```

### 2.2. Tecnologías principales

- Backend: Node.js 20+, Express 5, Prisma ORM, Supabase Postgres, Supabase Auth, Supabase Storage
- Frontend: Angular 21 (Standalone Components), RxJS, TailwindCSS, Supabase JS
- Base de datos: Postgres (instancia Supabase)
- Almacenamiento de medios: Supabase Storage (`beengine-media`)

## 3. Backend

### 3.1. Propósito
El backend expone una API REST bajo `backend/src/server.js` y `backend/src/app.js`. Su trabajo principal es:
- recibir solicitudes del frontend
- orquestar datos deportivos desde APIs externas
- almacenar caché en Postgres
- servir datos consolidados de la aplicación
- gestionar autenticación y acceso

### 3.2. Componentes clave

- `backend/src/server.js`: entrypoint del servidor. Crea Express, middleware, CORS y arranca la app.
- `backend/src/app.js`: configuración de rutas generales y agentes.
- `backend/src/config/env.js`: variables de entorno y ajustes de proveedores.
- `backend/src/routes/`: define los endpoints del API.
- `backend/src/controllers/`: maneja la lógica de cada ruta.
- `backend/src/services/`: encapsula llamadas a APIs externas y orquestación de socios deportivos.
- `backend/src/repositories/`: acceso a la base de datos vía Prisma.

### 3.3. API y respuesta estándar

El backend usa un formato uniforme:
- `{ success: true, data: ... }`
- `{ success: false, error: ... }`

Endpoints relevantes:
- `/api/health` → salud de la API
- `/api/landing` → datos del landing y categorías
- `/api/f1`, `/api/motogp`, `/api/f2`, `/api/f3`, `/api/moto2`, `/api/moto3` → rutas de datos por serie
- `/api/auth` → login y registro con Supabase Auth

### 3.4. Sincronización de datos

El backend cuenta con scripts de sincronización en `backend/scripts/`:
- `scripts/refresh-all.mjs` → sincronización completa de datos
- `scripts/refresh-formula.mjs` → sincronización de series F1/F2/F3
- `scripts/refresh-moto.mjs` → sincronización MotoGP/Moto2/Moto3
- `scripts/sync/sync-f1.mjs` → actualización específica de F1
- `scripts/sync/sync-feeder.mjs` → F2/F3
- `scripts/sync/sync-moto.mjs` → MotoGP/Moto2/Moto3
- `scripts/sync/sync-news.mjs` → sincroniza noticias RSS

Estas tareas combinan varias fuentes externas y guardan snapshots en Postgres para tolerancia a fallos.

### 3.5. Fuentes de datos externas

El backend usa diferentes proveedores según la serie:
- F1: Jolpica / Ergast, OpenF1
- F2/F3: FIA Formula 2 / 3 oficiales
- MotoGP/Moto2/Moto3: Pulse Live
- MotoGP clima: Open-Meteo
- Noticias: BBC, Motorsport.com, Crash.net, Formula1.com

### 3.6. Base de datos

Se usa Prisma con schema en `backend/prisma/schema.prisma` y migraciones en `backend/prisma/migrations/`.

Tablas importantes:
- `driver_season_entries`
- `drivers`
- `teams`
- `circuits`
- `news`
- `assist_snapshots`

El project usa `prisma generate`, `prisma migrate dev`, `prisma db seed` y `prisma studio`.

### 3.7. Almacenamiento de medios

Supabase Storage gestiona imágenes y archivos multimedia:
- logos
- fotos de pilotos
- circuitos

Scripts como `scripts/upload-media-to-supabase.mjs` suben archivos a los buckets. Estas imágenes se usan tanto en la UI como en la carga de perfiles.

### 3.8. Autenticación y autorización

Supabase Auth gestiona el login con email/contraseña y Google OAuth.

Variables de entorno críticas:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `FRONTEND_URL`

## 4. Frontend

### 4.1. Propósito
La aplicación Angular consume la API del backend y presenta:
- home con portadas
- listados de pilotos, escuderías y resultados
- páginas de calendario y clasificación
- noticias por serie
- perfil de cada piloto
- un landing público con seis categorías

### 4.2. Estructura del frontend

Carpetas principales:
- `src/app/features/` → páginas y casos de uso principales
- `src/app/shared/` → componentes reutilizables (header, sidebar, tarjetas, tablas)
- `src/app/core/` → servicios comunes, contexto de series, API global, auth
- `src/app/data/` → datos estáticos como series y deportes

### 4.3. Enrutado y navegación

El frontend usa rutas Angular declaradas en `app.routes.ts` y carga perezosamente páginas de cada serie.

### 4.4. Frontend de series

Cada serie tiene configuraciones de color y comportamiento en `frontend/src/app/core/series/series.config.ts`:
- `f1`: `#FFD100`
- `f2`: `#0090FF`
- `f3`: `#9E9E9E`
- `motogp`: `#0052CC`
- `moto2`: `#FF6B35`
- `moto3`: `#52C41A`

Estas configuraciones alimentan la UI para:
- encabezados
- tarjetas de color
- componentes de acento
- pestañas de navegación

### 4.5. Páginas clave

- `features/landing/landing.page.ts`: landing público con cards de categoría, noticias y destacados.
- `features/drivers/`: fichas de pilotos, listado de pilotos y lógica de imágenes dinámicas.
- `features/calendar/`: páginas de calendario para cada serie.
- `features/standings/`: clasificación por serie.
- `features/news/`: feed de noticias y detalle.
- `features/auth/`: login y registro.

### 4.6. Carga de imágenes de pilotos

Hay lógica central en `frontend/src/app/features/drivers/drivers-shared.ts` para resolver URL de foto de piloto.

Comportamiento:
- usa `headshotUrl` de la API cuando existe
- si no existe, construye una URL dinámica a los assets de Supabase
- soporta fallback con el bucket F1 y un caso especial para `arvid_lindblad`

### 4.7. Datos del landing

`frontend/src/app/features/landing/landing.service.ts` transforma la respuesta del API y mezcla:
- metadatos estáticos de `landing.data.ts`
- standings y calendario por serie
- selector de próximo GP
- noticias combinadas de F1 y MotoGP
- favoritos con piloto destacado

Es decir, el landing ya no solo renderiza texto estático, sino que mezcla datos reales de standings + calendario + noticias.

### 4.8. Ecosistema Angular

- Componentes standalone para renderizado directo sin módulos intermedios
- `ChangeDetectionStrategy.OnPush` para rendimiento
- `signal` y `computed` de Angular para estado reactivo
- uso de `RouterLink` para navegación interna
- `style` inline con `cat.accent` para colorear tarjetas dinámicamente

## 5. Flujo de datos completo

1. El usuario carga la UI Angular.
2. El frontend llama a la API del backend (`/api/landing`, `/api/f1`, etc.).
3. El backend trae datos de cache Postgres o de APIs externas.
4. Si la fuente externa falla, el backend usa datos sincronizados previamente.
5. El backend responde con JSON uniforme.
6. El frontend transforma esos datos y los presenta en cards, tablas y páginas de serie.
7. Las imágenes de pilotos usan URLs de Supabase o fallback dinámico.
8. Las noticias se sincronizan desde RSS y se muestran en la app con filtros por serie.

## 6. Observaciones importantes encontradas en la auditoría

### 6.1. Configuración de series
La app mantiene dos fuentes similares de colores:
- `frontend/src/app/core/series/series.config.ts`
- `frontend/src/app/features/landing/landing.data.ts`

Esto es aceptable si ambas fuentes se mantienen sincronizadas, pero hay mayor riesgo de inconsistencias si se cambia solo una.

### 6.2. Fallback de imágenes de pilotos
La resolución de foto está centralizada en `drivers-shared.ts`, lo cual es una buena práctica.
El backend también tiene lógica de imagen en `landing.service.ts` y `db/feeder.repository.js` para garantizar la compatibilidad con F1 y los feeder series.

### 6.3. Salud y tolerancia
El backend expone `GET /api/health` y utiliza cache Postgres como fallback, lo cual es un diseño sólido para apps de datos deportivos en vivo.

### 6.4. Sincronización con Supabase
Los scripts están preparados para:
- sincronizar datos de fin de semana
- refrescar todos los datos
- subir y verificar medios

Esto permite operar el producto en producción con datos actualizados y activos incluso cuando las APIs externas no respondan.

## 7. Resumen de la aplicacion

### 7.1. Mensaje clave
BeEngine no es solo una UI deportiva: es un sistema completo que integra varias APIs externas, una capa de caché independiente, y un frontend moderno con experiencia de usuario multiserie.

### 7.2. Puntos fuertes técnicos
- Arquitectura desacoplada: frontend Angular + backend Express + Postgres + Supabase Storage/Auth
- Diseño tolerante a fallos: fallback en DB cuando la API externa falla
- Sincronización offline: scripts de refresh y sync para mantener la aplicación viva
- Experiencia de datos en tiempo real: live timing y noticias combinadas
- Uso de IA: asistente contextual integrado mediante snapshots en base de datos

### 7.3. Ejemplos prácticos
- `frontend/features/landing`: demuestra cómo combinar datos reales de standings, calendario y noticias en una landing dinámica.
- `backend/scripts/sync/sync-f1.mjs`: muestra la gestión de sincronización y el tratamiento de datos incompletos.
- `frontend/core/series/series.config.ts`: evidencia de cómo se mantiene consistencia visual por serie.

## 8. Cómo ejecutar el proyecto

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

### Validación
- API: `curl http://localhost:3000/api/health`
- UI: `http://localhost:4200`
