# BeEngine

Hub web de motorsport: F1, F2, F3, MotoGP, Moto2 y Moto3. Calendarios, clasificaciones, noticias, perfiles y asistente con IA.

**Frontend:** Angular · **Backend:** Node.js + Express · **Base de datos:** Supabase (Postgres)

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

- `apiUrl` → URL del API desplegado (ej. `https://beengine.onrender.com/api`)

Con `ng serve` se usa `environment.development.ts` (API local).

---

## Despliegue

| Parte | Dónde suele ir |
|-------|----------------|
| Frontend | Vercel |
| Backend | Render |

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
