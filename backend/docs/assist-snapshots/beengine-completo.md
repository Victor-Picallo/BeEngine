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

## Dónde está

Botón flotante **abajo a la derecha** (icono de chat amarillo). Visible en todas las páginas excepto `/login`.

## Qué hace

- Responde preguntas sobre **cómo usar BeEngine**: rutas, secciones, cuenta, live, datos.
- Usa documentación interna (snapshots) cargada en el servidor, **no** resultados en vivo de la pista.
- El contexto se adapta a la sección en la que estás (F1, MotoGP, etc.) para priorizar documentos de esa serie.

## Cómo preguntar

Ejemplos útiles:

- «¿Cómo veo el calendario de MotoGP?»
- «¿Dónde está el live de F1?»
- «¿Cómo guardo un piloto favorito?»
- «¿De dónde salen los datos?»

## Datos deportivos (clasificación, líder, calendario)

Para preguntas como «¿quién va primero en F1?», «clasificación», «próxima carrera» o «última carrera», el servidor **inyecta datos actuales** desde la misma base de datos / APIs que usa la app (bloque «DATOS ACTUALES BEENGINE»). No hace falta subir eso como snapshot manual.

## Límites

- El timing vuelta a vuelta en directo sigue en `/f1/live` o `/motogp/live`, no en el chat.
- Si el servidor no tiene `GROQ_API_KEY` o base de datos, dirá que no está disponible.
- Límite de preguntas por minuto (rate limit) para evitar abuso.

## Fuentes en la respuesta

A veces verás «Basado en: …» con el título de los documentos usados.

## Mantenimiento (equipo técnico)

Los textos se suben a la tabla `assist_knowledge_snapshots` con `npm run assist:snapshot:seed` desde archivos en `backend/docs/assist-snapshots/`.

---

## BeEngine — visión general

BeEngine es una **plataforma web de motor** que unifica seis categorías en una sola interfaz:

| Serie | URL raíz | Color marca |
|-------|----------|-------------|
| Formula 1 | `/` (inicio) y `/f1/...` | Amarillo #FFD100 |
| Formula 2 | `/f2` | Azul #0090FF |
| Formula 3 | `/f3` | Gris #9E9E9E |
| MotoGP | `/motogp` | Azul #0052CC |
| Moto2 | `/moto2` | Naranja #FF6B35 |
| Moto3 | `/moto3` | Verde #52C41A |

## Qué puedes hacer

- Ver **inicio** de cada categoría: próxima carrera, countdown, última carrera, podio, clasificación resumida, noticias.
- Consultar **calendario**, **clasificación** (pilotos y equipos/escuderías), **listado de pilotos** y **fichas detalladas**.
- Leer **noticias** (F1 y categorías moto según disponibilidad en base de datos).
- Seguir **timing en directo** donde esté disponible: F1 (`/f1/live`) y MotoGP (hub `/motogp/live` y sesiones desde calendario).
- **Cuenta de usuario**: registro, login con email o Google, favoritos en la barra lateral.

## Interfaz común

- **Barra superior (topbar)**: cambia de categoría (F1, F2, F3, MotoGP, Moto2, Moto3).
- **Barra lateral (sidebar)**: secciones (Inicio, Noticias, Calendario, Pilotos, Escuderías/Equipos, Clasificación) y bloque «Tus favoritos» si has iniciado sesión.
- **Asistente de ayuda**: botón flotante abajo a la derecha (icono de chat). Responde según la documentación cargada; no inventa resultados en vivo no documentados.

## Temporada

La interfaz muestra **Temporada 2026** en la home. Los datos dependen de la sincronización del servidor (ver snapshot «Datos y actualización»).

## URLs antiguas (redirecciones)

Rutas sin prefijo `/f1` redirigen automáticamente: `/pilotos` → `/f1/pilotos`, `/calendario` → `/f1/calendario`, etc.

---

## Calendario y clasificación

## Calendario

Ruta: `/{serie}/calendario`

- Lista de rondas / Grandes Premios del campeonato.
- Cada evento enlaza a resultados o sesiones según la serie:
  - **F1**: sesiones FP1–FP3, clasificación, carrera (`/f1/calendario/:race/:session`).
  - **F2/F3/Moto**: misma idea con página feeder de resultados.
  - **MotoGP**: sesiones pueden abrir live feed.

Los circuitos pueden mostrar trazado SVG o imagen si están enriquecidos en la base de datos.

## Clasificación

Ruta: `/{serie}/clasificacion`

- **Campeonato de pilotos**: posición, puntos, victorias.
- **Campeonato de equipos/constructores**: paralelo en la misma página o pestañas según el diseño de la serie.

Los puntos se actualizan cuando el backend sincroniza resultados tras cada carrera.

## API

- Calendario: rutas `jolpica/calendar` (fórmula) o `pulselive/...` (moto) bajo `/api/{serie}/`.
- Standings: `driver-standings`, `constructor-standings`.

## Consulta habitual

«¿Cuándo es la próxima carrera?» → mirar **Inicio** (countdown) o **Calendario** de la categoría elegida en el topbar.

---

## Cuenta de usuario

## Acceso

- **Iniciar sesión / Crear cuenta**: `/login` (alias `/registro` → registro).
- **Email y contraseña**: mínimo 8 caracteres en registro.
- **Google**: botón Google en login; primera vez redirige a **Completar tu perfil** (categoría + piloto favoritos).
- **Recuperar contraseña**: en login → «¿Olvidaste la contraseña?» → email con enlace → `/login?tab=new-password`.

## Registro

1. Nombre, email, contraseña.
2. Elegir **categoría favorita** (F1, F2, F3, MotoGP, Moto2, Moto3).
3. Elegir **piloto favorito** de esa categoría (lista cargada desde el API).
4. Si Supabase exige confirmar email, los favoritos se guardan al primer login tras confirmar.

## Favoritos

- Se guardan en el servidor (perfil de usuario).
- Aparecen en la sidebar como «Tus favoritos» con enlace a la home de la categoría o a la ficha del piloto.
- Tras login con Google sin favoritos previos, la app pide completar onboarding.

## Cerrar sesión

Botón al pie del sidebar cuando hay sesión activa.

## Limitaciones

- No hay pantalla pública «editar perfil» para cambiar favoritos después del registro (solo vía nuevo bootstrap interno).
- El asistente de ayuda y el resto de la app funcionan **sin** cuenta; la cuenta personaliza favoritos y nombre mostrado.

---

## Origen y actualización de datos

BeEngine muestra datos desde un **API backend** (`/api/...`) que combina:

- **PostgreSQL (Supabase)** — calendarios, standings, perfiles enriquecidos, noticias, medios (URLs de imágenes en Storage).
- **APIs externas en vivo o bajo demanda** — según categoría y configuración del servidor.

## Fuentes por categoría (resumen)

| Serie | Fuente principal | Notas |
|-------|------------------|--------|
| F1 | Jolpica/Ergast + OpenF1 | Live timing OpenF1; perfiles enriquecidos en DB |
| F2 / F3 | FIA (web oficial) + DB | Calendario/resultados; fallback si falla red |
| MotoGP | Pulse Live + DB | Live en fin de semana; sync a DB |
| Moto2 / Moto3 | Pulse Live + DB | Similar a MotoGP sin página live dedicada en app |

## Badge «Datos en caché»

En la home puede aparecer un indicador de si los datos vienen de caché/DB o de fuente en vivo. No significa que estén desactualizados necesariamente.

## Actualización (equipo / servidor)

Tras cada Gran Premio el mantenedor suele ejecutar en el backend:

- `npm run refresh` — sync completo F1+F2+F3+Moto + medios.
- `npm run refresh:weekend` — solo standings y resultados recientes.

La app **no** actualiza sola la base de datos; depende de esos procesos.

## Medios (fotos, logos, circuitos)

- URLs públicas desde **Supabase Storage** (bucket `beengine-media`).
- El frontend **no** usa carpetas locales de equipos; todo viene del API.

## Datos en el asistente de ayuda

- **Documentación** (snapshots / guía `beengine-completo`): cómo usar la app.
- **Datos deportivos actuales** (automático por pregunta): líderes, equipos, próxima y última carrera desde la misma DB/API que la app. Si preguntan por **todas las categorías** o desde scope global sin serie concreta, se inyecta resumen de F1, F2, F3, MotoGP, Moto2 y Moto3.
- **Noticias** (automático si preguntan por noticias/titulares): últimos titulares RSS/BD por categoría.
- **Búsqueda de piloto** por nombre en las clasificaciones cuando el mensaje parece referirse a un piloto concreto.
- **No** incluye timing vuelta a vuelta en directo; eso está en `/f1/live` y `/motogp/live`.

---

## Cómo navegar en BeEngine

## Barra superior (topbar)

- Muestra el logo y enlaces a cada **categoría**: F1, F2, F3, MotoGP, Moto2, Moto3.
- Al pulsar una categoría, cambias el contexto de toda la app a esa serie.
- El enlace «home» de la categoría lleva a `/` para F1 o a `/f2`, `/f3`, `/motogp`, etc. para el resto.

## Barra lateral (sidebar)

Secciones habituales (pueden variar ligeramente en moto: «Equipos» en lugar de «Escuderías»):

| Sección | Descripción |
|---------|-------------|
| **Inicio** | Home de la categoría activa |
| **Noticias** | Listado de artículos |
| **Calendario** | Grandes Premios / rondas del campeonato |
| **Pilotos** | Grid o listado; clic abre ficha |
| **Escuderías / Equipos** | Constructores o equipos |
| **Clasificación** | Campeonato de pilotos y equipos |

## Bloque «Tus favoritos» (con sesión)

Si has iniciado sesión (`/login`):

- Verás hasta dos accesos rápidos: **categoría favorita** y **piloto favorito** elegidos en el registro u onboarding Google.
- Si no hay sesión, el bloque invita a «Iniciar sesión».

## Bloque «Conectado como»

Al final del sidebar: nombre de usuario y botón **Cerrar sesión**.

## Banner «EN VIVO»

En la home, si hay sesión en directo, aparece un banner amarillo/acento con enlace **Ver Live** (F1 o MotoGP según la serie).

---

## Live timing

Solo **Formula 1** y **MotoGP** tienen experiencia live dedicada en la app.

## Formula 1

- **Ruta**: `/f1/live`
- Datos en tiempo real vía **OpenF1** cuando hay sesión.
- Desde la home, el banner «EN VIVO» enlaza aquí.
- Muestra tiempos de vuelta, posiciones, etc., según disponibilidad de la API externa.

## MotoGP

- **Hub**: `/motogp/live` — entrada al fin de semana.
- **Por GP y sesión**: `/motogp/calendario/:race/:session` — feed live de Pulse Live (FP1, FP2, FP3, Q1, Q2, Sprint, Race… según el evento).
- Home MotoGP puede enlazar al live cuando hay sesión activa.

## F2, F3, Moto2, Moto3

**No** tienen página `/live` global. Los resultados se consultan en el **calendario** → evento → sesión (vista de resultados, no timing continuo tipo F1).

## Fuera de horario

Si no hay sesión en curso, las páginas live pueden estar vacías o mostrar estado inactivo; no es un error de login.

---

## Formula 1 en BeEngine

F1 es la categoría por defecto. El inicio global es `/` (misma home que F1).

## Rutas principales

| Sección | Ruta |
|---------|------|
| Inicio | `/` o `/f1` |
| Calendario | `/f1/calendario` |
| Clasificación | `/f1/clasificacion` |
| Pilotos | `/f1/pilotos` |
| Ficha piloto | `/f1/pilotos/:driverId` |
| Escuderías | `/f1/escuderias` |
| Ficha escudería | `/f1/escuderias/:constructorId` |
| Noticias | `/f1/noticias` o `/noticias` |
| Artículo | `/f1/noticias/:articleId` o `/noticias/:articleId` |
| **Live timing** | `/f1/live` |

## Calendario y sesiones de un GP

- Desde el calendario se entra a un Gran Premio.
- Ruta de sesión: `/f1/calendario/:race/:session` (ej. `fp1`, `fp2`, `fp3`, `qualifying`, `race`).
- `/f1/calendario/:race` redirige a la primera sesión (fp1).

## Home F1

Muestra: progreso de temporada, próxima carrera con countdown, última carrera y podio, tabla de clasificación de pilotos resumida, noticias recientes.

## Perfiles

- **Piloto**: estadísticas, trayectoria, foto desde API.
- **Escudería**: plantilla, resultados, branding.

## Live

`/f1/live` — timing en directo cuando hay sesión activa (OpenF1). Si no hay sesión, la página puede estar vacía o informativa.

## Compatibilidad URLs antiguas

`/pilotos`, `/calendario`, `/escuderias`, `/clasificacion` → redirigen a rutas bajo `/f1/`.

---

## Formula 2 en BeEngine

URL raíz: **`/f2`**

Misma estructura de menú que F1 (Inicio, Noticias, Calendario, Pilotos, Escuderías, Clasificación).

## Rutas

| Sección | Ruta |
|---------|------|
| Inicio | `/f2` |
| Calendario | `/f2/calendario` |
| Clasificación | `/f2/clasificacion` |
| Pilotos | `/f2/pilotos` |
| Ficha piloto | `/f2/pilotos/:driverId` |
| Escuderías | `/f2/escuderias` |
| Ficha escudería | `/f2/escuderias/:constructorId` |
| Noticias | `/f2/noticias` |
| **Resultados por sesión** | `/f2/calendario/:race/:session` |

## Sesiones de carrera (feeder)

Al abrir un evento del calendario F2, ves resultados por sesión (entrenamientos, clasificación, carrera sprint/feature según el fin de semana). UI tipo «feeder race», no la misma que F1 live timing.

## Diferencias con F1

- **No** hay `/f2/live` de timing OpenF1.
- Perfiles de piloto más básicos que F1.
- Datos sincronizados desde FIA + base de datos del proyecto.

## Cambiar desde otra categoría

Usa el topbar o el selector de categorías en el sidebar y elige **F2**.

---

## Formula 3 en BeEngine

URL raíz: **`/f3`**

Estructura idéntica a F2.

## Rutas

| Sección | Ruta |
|---------|------|
| Inicio | `/f3` |
| Calendario | `/f3/calendario` |
| Clasificación | `/f3/clasificacion` |
| Pilotos | `/f3/pilotos` |
| Ficha piloto | `/f3/pilotos/:driverId` |
| Escuderías | `/f3/escuderias` |
| Ficha escudería | `/f3/escuderias/:constructorId` |
| Noticias | `/f3/noticias` |
| Resultados sesión | `/f3/calendario/:race/:session` |

## Funcionalidad

- Home con próxima carrera, clasificación y noticias de F3.
- Calendario con acceso a resultados por sesión (página feeder).
- Sin página de live timing dedicada.

## Datos

Fuente principal: **FIA Formula 3** (oficial) con respaldo en PostgreSQL tras sync del backend.

---

## Moto2 en BeEngine

URL raíz: **`/moto2`**

## Rutas

| Sección | Ruta |
|---------|------|
| Inicio | `/moto2` |
| Calendario | `/moto2/calendario` |
| Clasificación | `/moto2/clasificacion` |
| Pilotos | `/moto2/pilotos` |
| Ficha piloto | `/moto2/pilotos/:driverId` |
| Equipos | `/moto2/escuderias` |
| Ficha equipo | `/moto2/escuderias/:constructorId` |
| Noticias | `/moto2/noticias` |
| Resultados sesión | `/moto2/calendario/:race/:session` |

## Diferencias con MotoGP

- **No** hay página `/moto2/live` centralizada como MotoGP.
- Resultados por sesión desde el calendario (feeder race UI).
- Perfiles de piloto y equipo completos (fotos desde API/Storage).

## Navegación

Selector de categoría en topbar → **Moto2**, o sidebar si ya estás en el árbol moto.

---

## Moto3 en BeEngine

URL raíz: **`/moto3`**

## Rutas

| Sección | Ruta |
|---------|------|
| Inicio | `/moto3` |
| Calendario | `/moto3/calendario` |
| Clasificación | `/moto3/clasificacion` |
| Pilotos | `/moto3/pilotos` |
| Ficha piloto | `/moto3/pilotos/:driverId` |
| Equipos | `/moto3/escuderias` |
| Ficha equipo | `/moto3/escuderias/:constructorId` |
| Noticias | `/moto3/noticias` |
| Resultados sesión | `/moto3/calendario/:race/:session` |

## Funcionalidad

Igual patrón que Moto2: home, calendario, clasificaciones duales (pilotos y equipos), noticias, fichas.

## Datos

Pulse Live + base de datos; sincronización con los comandos `refresh` del backend (bloque moto).

---

## MotoGP en BeEngine

URL raíz: **`/motogp`**

En el menú lateral la sección de constructores se llama **Equipos** (misma ruta `/motogp/escuderias`).

## Rutas

| Sección | Ruta |
|---------|------|
| Inicio | `/motogp` |
| Calendario | `/motogp/calendario` |
| Clasificación | `/motogp/clasificacion` |
| Pilotos | `/motogp/pilotos` |
| Ficha piloto | `/motogp/pilotos/:driverId` |
| Equipos | `/motogp/escuderias` |
| Ficha equipo | `/motogp/escuderias/:constructorId` |
| Noticias | `/motogp/noticias` |
| **Live hub** | `/motogp/live` |
| **Live sesión GP** | `/motogp/calendario/:race/:session` |

## Live MotoGP

- **`/motogp/live`**: punto de entrada al live del fin de semana.
- Desde el **calendario**, al elegir un GP y sesión (FP, Q, Sprint, Race…), se abre la página de live feed con tiempos y contexto de circuito.

## Home MotoGP

Similar a F1: countdown, última carrera, clasificación, noticias; puede mostrar banner EN VIVO con enlace al live.

## Datos

**Pulse Live** (API oficial MotoGP) en fin de semana; resto desde PostgreSQL tras sincronización.

## Moto2 y Moto3

Categorías hermanas con rutas `/moto2` y `/moto3`. El asistente incluye documentación específica; en consultas de Moto2/Moto3 también se usa contexto MotoGP cuando aplica.

---

## Noticias en BeEngine

## Acceso

- Por categoría: `/f1/noticias`, `/f2/noticias`, … `/motogp/noticias`, etc.
- Ruta global F1 también: `/noticias` y `/noticias/:articleId` (redirige o sirve F1 según implementación).

## Listado

- Tarjetas con imagen, título, fecha, tags si existen.
- Filtro por categoría vía query `?cat=` en algunas vistas moto/noticias cruzadas.

## Detalle

- Ruta tipo `/f1/noticias/:articleId` — cuerpo del artículo, imagen destacada.
- Los artículos viven en PostgreSQL (`news_articles`), sincronizados para **F1 y MotoGP** (según configuración del proyecto).

## Si no hay noticias

Puede deberse a que el sync de noticias no se ha ejecutado (`npm run db:sync:news` en el servidor) o no hay artículos para esa categoría.

## API

- `GET /api/news/:category` — listado.
- `GET /api/news/article/:articleId` — detalle.

---

## Pantalla de inicio

Cada categoría tiene una **home** al pulsar «Inicio» en el sidebar:

- F1: `/` o `/f1`
- F2: `/f2`, F3: `/f3`, MotoGP: `/motogp`, etc.

## Elementos habituales

1. **Cabecera** — nombre de la categoría, badge «Temporada 2026», indicador de fuente de datos.
2. **Progreso de temporada** — rondas completadas vs total (barra y puntos).
3. **Próxima carrera** — nombre del GP, circuito, fecha, cuenta atrás (días/horas/minutos).
4. **Última carrera** — resultado resumido, podio (P1–P3).
5. **Clasificación** — top pilotos del campeonato con enlace a clasificación completa.
6. **Noticias** — últimos titulares con enlace a la sección Noticias.

## Banner en vivo

Si hay sesión activa según el API, banner **EN VIVO** con enlace a Live (F1 o MotoGP).

## Carga y errores

- Mientras carga: mensaje «Cargando datos…».
- Si falla el API: mensaje de error en la zona principal.
- Los datos vienen de `GET /api/home/:category` (category = f1, f2, f3, motogp, moto2, moto3).

## Cambiar de categoría

Desde el topbar sin perder el concepto de «inicio»: cada serie tiene su propia home independiente.

---

## Fichas de pilotos y equipos

## Pilotos

- Listado: `/{serie}/pilotos` (ej. `/f1/pilotos`).
- Ficha: `/{serie}/pilotos/:driverId` — el `driverId` es el identificador del API (no siempre el nombre visible).

Contenido típico:

- Nombre, número, nacionalidad, equipo actual.
- Foto (headshot) desde URL del API / Supabase Storage.
- Estadísticas de temporada y, en F1/MotoGP, secciones más ricas (trayectoria, agregados).

**F1 y MotoGP**: perfiles «completos». **F2/F3**: perfiles más básicos.

## Escuderías / equipos

- Listado: `/{serie}/escuderias`
- Ficha: `/{serie}/escuderias/:constructorId`

Incluye branding (color), plantilla de pilotos, resultados por carrera en algunas series.

## Moto: «Equipos» en el menú

En MotoGP, Moto2 y Moto3 el sidebar dice **Equipos** pero la URL sigue siendo `/escuderias`.

## Cómo llegar desde favoritos

Si tienes piloto favorito en la sidebar, un clic te lleva directamente a su ficha (en F1: `/f1/pilotos/:id`).

## API (ejemplos F1)

- `GET /api/f1/jolpica/drivers/:driverId/profile`
- `GET /api/f1/jolpica/constructors/:constructorId/profile`

Otras series tienen rutas análogas bajo `/api/f2`, `/api/f3`, `/api/motogp`, etc.