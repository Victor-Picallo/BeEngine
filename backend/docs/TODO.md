# BeEngine — TODO

**Un comando tras cada GP** (F1 + F2 + F3 + MotoGP + Moto2 + Moto3):

```bash
cd backend
npm run refresh
```

Fin de semana (solo standings/resultados recientes):

```bash
npm run refresh:weekend
```

Sin subir imágenes a Storage:

```bash
npm run refresh -- --no-storage
```

Atajos parciales: `npm run refresh:formula` · `npm run refresh:moto`

Comprobar medios al 100 %:

```bash
npm run verify:media -- --strict
```

**Circuitos F1/F2/F3 sin colores (trazado liso blanco, coggs/f1_svg → Postgres + Supabase):**

```bash
npm run db:enrich:formula-circuits
npm run storage:upload:circuits -- --formula-only
```

El calendario API fusiona `circuitSvgUrl` / `circuitImageUrl` desde la tabla `events` (no Pulse).

---

## Medios en DB — cerrado (6 series)

| Bloque | Comando verify |
|--------|----------------|
| F1 / F2 / F3 | `npm run verify:media -- --formula --strict` |
| MotoGP / Moto2 / Moto3 | `npm run verify:media -- --moto --strict` |
| **Todo** | `npm run verify:media -- --strict` |

---

## Manual

- [ ] Health: `http://localhost:3000/api/health`
- [ ] QA badge “Datos en caché”
- [ ] Prisma Studio
- [ ] GitHub secrets CI (`DATABASE_URL`, `DIRECT_URL`)

## Otros

| Área | Notas |
|------|--------|
| Noticias | F1 + MotoGP en DB |
| Perfiles | `profile_meta` en Postgres (`db:sync:profiles` = verificación) |
| Medios UI | Solo URLs del API; sin `public/*/teams` ni mapas CDN en Angular |
| Auth | Supabase Auth + `user_profiles` / `user_favorites` (`GET /api/auth/config`, `GET/POST /api/me`) |
| Cron | Manual post-GP; sin scheduler en repo |

## Comandos sueltos

| Comando | Cuándo |
|---------|--------|
| `npm run db:sync:f1` | Solo sync F1 |
| `npm run storage:upload` | Solo Storage (sin sync previo) |
| `npm run db:enrich:formula-circuits` | Solo circuitos fórmula |
| `npm run db:migrate` | Tras cambios Prisma (p. ej. tablas auth) |

### Auth (login / registro / Google)

1. En Supabase: activar **Email**. Site URL = `http://localhost:4200`. Redirect URLs: `http://localhost:4200/**`.
2. **Google OAuth**: Supabase → Authentication → Providers → Google (Client ID/secret de [Google Cloud Console](https://console.cloud.google.com/apis/credentials)). Orígenes autorizados: `http://localhost:4200`. Redirect URI de Google: la que muestra Supabase (`https://<project>.supabase.co/auth/v1/callback`).
3. En `backend/.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`.
4. `cd backend && npm run db:migrate`
5. Arrancar API + `ng serve`. Probar `/login`, `/login?tab=register` y botón **Google** (primer acceso → `/login?tab=onboarding` para elegir favoritos).

### Asistente IA (Groq)

1. `GROQ_API_KEY` y `GROQ_MODEL` en `backend/.env`.
2. `npm run db:migrate` (tabla `assist_knowledge_snapshots`).
3. **`npm run assist:snapshot:seed`** — sube todos los `.md` de `backend/docs/assist-snapshots/` (frontmatter YAML: slug, title, scope, tags).
4. **`npm run assist:snapshot:merge`** — regenera `beengine-completo.md` desde el resto de snapshots; luego `seed`.
5. El snapshot **`beengine-completo`** (scope global) es la guía unificada; el chat lo usa como documento principal si está activo.
6. Editar o añadir un `.md` y volver a ejecutar merge + seed para actualizar la DB.
7. El chat inyecta **datos en vivo** (6 series, noticias, búsqueda de piloto) además de snapshots. Opcional: `ASSIST_LIVE_MAX_CHARS` (default 22000).
8. Botón **Ayuda** (chat) abajo a la derecha → `POST /api/assist/chat`.

Snapshots incluidos: overview, interfaz, cuenta, datos, home, noticias, live, perfiles, calendario/clasificación, asistente, y navegación por serie (f1, f2, f3, motogp, moto2, moto3).
