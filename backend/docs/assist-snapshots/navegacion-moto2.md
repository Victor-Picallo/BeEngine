---
slug: navegacion-moto2
title: Moto2 — rutas y funciones
scope: moto2
tags: moto2 calendario pilotos equipos clasificación
---

# Moto2 en BeEngine

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
