---
slug: navegacion-moto3
title: Moto3 — rutas y funciones
scope: moto3
tags: moto3 calendario pilotos equipos clasificación
---

# Moto3 en BeEngine

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
