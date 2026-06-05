---
slug: datos-actualizacion
title: De dónde salen los datos
scope: global
tags: datos api base de datos sync refresh fuentes
---

# Origen de los datos

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
