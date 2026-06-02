---
slug: perfiles-fichas
title: Fichas de pilotos y equipos
scope: global
tags: piloto escudería equipo perfil foto estadísticas trayectoria
---

# Fichas de pilotos y equipos

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
