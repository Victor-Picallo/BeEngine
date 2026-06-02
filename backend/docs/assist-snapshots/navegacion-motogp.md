---
slug: navegacion-motogp
title: MotoGP — rutas y funciones
scope: motogp
tags: motogp calendario pilotos equipos live clasificación
---

# MotoGP en BeEngine

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
