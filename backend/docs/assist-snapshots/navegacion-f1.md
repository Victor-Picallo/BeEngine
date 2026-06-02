---
slug: navegacion-f1
title: Formula 1 — rutas y funciones
scope: f1
tags: f1 calendario pilotos escuderías live clasificación noticias
---

# Formula 1 en BeEngine

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
