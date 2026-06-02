---
slug: beengine-overview
title: Qué es BeEngine
scope: global
tags: inicio plataforma categorías series overview
---

# BeEngine — visión general

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
