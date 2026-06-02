---
slug: navegacion-f2
title: Formula 2 — rutas y funciones
scope: f2
tags: f2 calendario pilotos escuderías clasificación feeder
---

# Formula 2 en BeEngine

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
