---
slug: navegacion-f3
title: Formula 3 — rutas y funciones
scope: f3
tags: f3 calendario pilotos escuderías clasificación feeder
---

# Formula 3 en BeEngine

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
