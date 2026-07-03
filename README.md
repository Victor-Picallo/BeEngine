# BeEngine

Hub web de motorsport: F1, F2, F3, MotoGP, Moto2 y Moto3. Calendarios, clasificaciones, noticias, perfiles y asistente con IA.

**Frontend:** Angular · **Backend:** Node.js + Express · **Base de datos:** Supabase (Postgres)

---

## APIs y fuentes de datos

El frontend habla con el **API propio de BeEngine** (`/api/...` en el backend). Ese API mezcla Postgres (caché) y estas fuentes externas:

### Datos deportivos

| API | Series | Para qué |
|-----|--------|----------|
| [Jolpica](https://api.jolpi.ca/ergast/f1) (Ergast) | F1 | Calendario, clasificaciones, resultados y perfiles de pilotos/equipos |
| [OpenF1](https://openf1.org) | F1 | Live timing, sesión en curso, clima y fotos de pilotos |
| [FIA Formula 2 / 3](https://www.fiaformula2.com) | F2, F3 | Calendario, standings y resultados oficiales |
| [Pulse Live](https://api.motogp.pulselive.com) | MotoGP, Moto2, Moto3 | Calendario, clasificaciones, resultados y live timing |
| [Open-Meteo](https://open-meteo.com) | MotoGP | Clima en el circuito durante sesiones en directo |

Si una API externa falla, el backend usa datos guardados en Postgres (sync con `npm run refresh`).

### Infraestructura

| Servicio | Para qué |
|----------|----------|
| **Supabase (Postgres)** | Base de datos: calendarios, standings, noticias, favoritos, snapshots del asistente |
| **Supabase Auth** | Login con email/contraseña y Google OAuth |
| **Supabase Storage** (`beengine-media`) | Logos, fotos de pilotos y assets de circuitos |
| **Groq** | Asistente de ayuda con IA (opcional; requiere `GROQ_API_KEY`) |

### Noticias (RSS)

Sincronizadas a Postgres con `npm run db:sync:news`. Fuentes por categoría:

| Fuente | Categorías |
|--------|------------|
| BBC Sport, Formula1.com, Motorsport.com, Crash.net | F1 |
| Motorsport.com, Crash.net | F2, F3 |
| Motorsport.com, Crash.net | MotoGP, Moto2, Moto3 |

---

## Arrancar en local

### Requisitos

- Node.js 20+
- npm

### Backend

```bash
cd backend
npm install
# Crea backend/.env (ver backend/README.md)
npm run dev
```

API en `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
ng serve
```

App en `http://localhost:4200`

Comprueba que el API responde:

```bash
curl http://localhost:3000/api/health
```

---

## Variables de entorno (backend)

Copia las variables descritas en `backend/README.md` a `backend/.env`. Lo mínimo:

| Variable | Uso |
|----------|-----|
| `PORT` | Puerto del API (3000) |
| `FRONTEND_URL` | URL del Angular (`http://localhost:4200` en local) |
| `DATABASE_URL` | Postgres de Supabase |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Auth y storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones de servidor |

En producción, `FRONTEND_URL` debe ser la URL pública del frontend (sin localhost).

---

## Frontend (producción)

En `frontend/src/environments/environment.ts`:

- `apiUrl` → URL del API desplegado (ej. antes: `https://beengine.onrender.com/api` nuevo: `https://be-engine-api.vercel.app/api` )

Con `ng serve` se usa `environment.development.ts` (API local).

---

## Despliegue

| Parte | Dónde suele ir |
|-------|----------------|
| Frontend | Vercel |
| Backend | Antes: Render Actualizado: Vercel |

Lo he cambiado a Vercel para evitar que la aplicacion se duerma

**Google OAuth (Supabase):**

1. Supabase → Authentication → **URL Configuration**  
   - Site URL = URL de Vercel  
   - Redirect URLs = `https://tu-dominio/**` y `http://localhost:4200/**`
2. Render → `FRONTEND_URL` = misma URL de Vercel
3. Google Cloud → redirect URI = `https://<tu-proyecto>.supabase.co/auth/v1/callback`

---

## Estructura del repo

```
BeEngine/
├── frontend/    # Angular
└── backend/     # API REST + sync de datos
```

Más detalle del API: [`backend/README.md`](backend/README.md)  
Documentación del asistente IA: [`backend/docs/README.md`](backend/docs/README.md)

---

## Licencia

[MIT](LICENSE)
