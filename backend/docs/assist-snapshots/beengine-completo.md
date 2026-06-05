---
slug: beengine-completo
title: BeEngine — guía completa
scope: global
tags: beengine ayuda guía completa f1 f2 f3 motogp moto2 moto3 login registro calendario clasificación live noticias pilotos escuderías equipos favoritos sidebar rutas api datos
---

# BeEngine — documentación completa

Este documento reúne **toda** la información de uso de la plataforma BeEngine (temporada 2026).
Para clasificación actual, líder del mundial o próxima carrera, el asistente también recibe **DATOS ACTUALES** desde la base de datos en tiempo de consulta.


---

## Asistente de ayuda

Botón flotante **abajo a la derecha** (chat amarillo). Visible en todas las páginas excepto `/login`.

## Qué responde

- Cómo usar BeEngine: rutas, secciones, cuenta, live.
- Clasificación, líder, próxima/última carrera (datos actuales de la misma DB/API que la app).
- Noticias recientes si preguntas por titulares.

## Qué no hace

- Timing vuelta a vuelta → usa `/f1/live` o `/motogp/live`.
- Necesita `GROQ_API_KEY` y base de datos en el servidor.

## Ejemplos

- «¿Cómo veo el calendario de MotoGP?»
- «¿Dónde está el live de F1?»
- «¿Cómo guardo un piloto favorito?»

---

## BeEngine

Plataforma web de motor con seis categorías:

| Serie | URL | Color |
|-------|-----|-------|
| F1 | `/`, `/f1/...` | #FFD100 |
| F2 | `/f2` | #0090FF |
| F3 | `/f3` | #9E9E9E |
| MotoGP | `/motogp` | #0052CC |
| Moto2 | `/moto2` | #FF6B35 |
| Moto3 | `/moto3` | #52C41A |

## Funciones

Inicio, calendario, clasificación, pilotos, equipos/escuderías, noticias, live (F1 y MotoGP), cuenta con favoritos.

## UI

- **Topbar**: cambiar categoría.
- **Sidebar**: secciones + favoritos (si hay sesión).
- **Asistente**: chat abajo a la derecha.

Temporada mostrada: **2026**. Rutas antiguas (`/pilotos`, `/calendario`…) redirigen a `/f1/...`.

---

## Calendario y clasificación

## Calendario

`/{serie}/calendario` — lista de GPs. Cada uno enlaza a sesiones o resultados:

- **F1**: `/f1/calendario/:gp/:session` (fp1, qualifying, race…)
- **F2/F3/Moto**: resultados por sesión
- **MotoGP**: puede abrir live

## Clasificación

`/{serie}/clasificacion` — puntos de pilotos y equipos/constructores.

## Dónde ver la próxima carrera

Home (countdown) o calendario de la serie activa en el topbar.

---

## Cuenta

## Login y registro

- `/login` — email/contraseña o **Google**
- Google (primera vez): onboarding con categoría y piloto favoritos
- Recuperar contraseña: enlace por email → `/login?tab=new-password`

## Favoritos

Categoría + piloto elegidos en registro. Aparecen en la sidebar. Requieren sesión.

## Cerrar sesión

Botón al pie del sidebar.

La app funciona sin cuenta; la cuenta solo personaliza favoritos y nombre.

---

## Origen de los datos

El API (`/api/...`) mezcla **Postgres (Supabase)** y **APIs externas**.

| Serie | Fuente |
|-------|--------|
| F1 | Jolpica + OpenF1 (live) |
| F2 / F3 | FIA + DB |
| MotoGP / 2 / 3 | Pulse Live + DB |

## Actualización

La app no sincroniza sola. Tras un GP, en el servidor:

- `npm run refresh` — sync completo
- `npm run refresh:weekend` — solo fin de semana

Imágenes y logos: **Supabase Storage** (`beengine-media`).

## En el asistente

- Guía de uso → snapshots de documentación.
- Datos deportivos y noticias → inyectados automáticamente al preguntar.
- Live timing → no; solo en las páginas de directo.

---

## Navegación

## Topbar

Logo + selector de categoría (F1, F2, F3, MotoGP, Moto2, Moto3). El home de cada una: `/` (F1) o `/f2`, `/motogp`, etc.

## Sidebar

| Sección | Qué es |
|---------|--------|
| Inicio | Home de la serie |
| Noticias | Artículos |
| Calendario | Rondas / GPs |
| Pilotos | Listado y fichas |
| Escuderías / Equipos | Constructores (moto: «Equipos») |
| Clasificación | Pilotos y equipos |

Con sesión: **Tus favoritos** (categoría + piloto) y **Cerrar sesión** abajo.

## Banner EN VIVO

En la home, si hay sesión activa, banner con enlace al live de la serie.

---

## Live timing

Solo **F1** y **MotoGP** tienen directo en la app.

| Serie | Ruta |
|-------|------|
| F1 | `/f1/live` (OpenF1) |
| MotoGP | `/motogp/live` y `/motogp/calendario/:gp/:session` |

F2, F3, Moto2 y Moto3: resultados en el **calendario**, no timing continuo.

Fuera de horario las páginas live pueden estar vacías; no es error de login.

---

## Formula 1

Categoría por defecto. Inicio: `/` o `/f1`.

| Sección | Ruta |
|---------|------|
| Calendario | `/f1/calendario` |
| Clasificación | `/f1/clasificacion` |
| Pilotos | `/f1/pilotos` |
| Piloto | `/f1/pilotos/:id` |
| Escuderías | `/f1/escuderias` |
| Noticias | `/f1/noticias` |
| **Live** | `/f1/live` |

Sesión de GP: `/f1/calendario/:gp/:session`. URLs cortas (`/pilotos`, `/calendario`…) redirigen a `/f1/...`.

---

## Formula 2

Inicio: `/f2`. Misma estructura que F1, sin página live.

| Sección | Ruta |
|---------|------|
| Calendario | `/f2/calendario` |
| Clasificación | `/f2/clasificacion` |
| Pilotos | `/f2/pilotos` |
| Escuderías | `/f2/escuderias` |
| Noticias | `/f2/noticias` |

Datos: FIA + base de datos.

---

## Formula 3

Inicio: `/f3`. Igual que F2 (sin live).

| Sección | Ruta |
|---------|------|
| Calendario | `/f3/calendario` |
| Clasificación | `/f3/clasificacion` |
| Pilotos | `/f3/pilotos` |
| Escuderías | `/f3/escuderias` |
| Noticias | `/f3/noticias` |

Datos: FIA + base de datos.

---

## Moto2

Inicio: `/moto2`. Como MotoGP pero **sin** página live central.

| Sección | Ruta |
|---------|------|
| Calendario | `/moto2/calendario` |
| Clasificación | `/moto2/clasificacion` |
| Pilotos | `/moto2/pilotos` |
| Equipos | `/moto2/equipos` |
| Noticias | `/moto2/noticias` |

Resultados por sesión desde el calendario.

---

## Moto3

Inicio: `/moto3`. Igual que Moto2 (sin live hub).

| Sección | Ruta |
|---------|------|
| Calendario | `/moto3/calendario` |
| Clasificación | `/moto3/clasificacion` |
| Pilotos | `/moto3/pilotos` |
| Equipos | `/moto3/equipos` |
| Noticias | `/moto3/noticias` |

Datos: Pulse Live + DB.

---

## MotoGP

Inicio: `/motogp`.

| Sección | Ruta |
|---------|------|
| Calendario | `/motogp/calendario` |
| Clasificación | `/motogp/clasificacion` |
| Pilotos | `/motogp/pilotos` |
| Equipos | `/motogp/equipos` |
| Noticias | `/motogp/noticias` |
| **Live hub** | `/motogp/live` |

Sesiones en vivo desde calendario o hub live. Datos: Pulse Live + DB.

---

## Noticias

Listado: `/{serie}/noticias` (F1 también `/noticias`).

Detalle: `/{serie}/noticias/:id`

Artículos en Postgres (RSS sincronizado). Si no hay noticias, puede faltar sync en el servidor (`npm run db:sync:news`).

API: `GET /api/news/feed/:category`

---

## Home

Cada serie tiene su inicio: `/` (F1), `/f2`, `/f3`, `/motogp`, `/moto2`, `/moto3`.

## Qué muestra

- Progreso de temporada 2026
- Próxima carrera + cuenta atrás
- Última carrera y podio
- Top de clasificación
- Noticias recientes
- Banner EN VIVO si aplica

Datos: `GET /api/home/:category`. Cambia de serie desde el topbar.

---

## Perfiles

## Pilotos

- Listado: `/{serie}/pilotos`
- Ficha: `/{serie}/pilotos/:driverId`

Foto, stats, trayectoria (más completo en F1 y MotoGP).

## Equipos / escuderías

- Listado: `/{serie}/escuderias`
- Ficha: `/{serie}/escuderias/:id`

En moto el menú dice **Equipos** pero la URL es `/escuderias`.

Los favoritos del sidebar enlazan a la ficha del piloto.