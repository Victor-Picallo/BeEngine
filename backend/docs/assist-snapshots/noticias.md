---
slug: noticias
title: Noticias
scope: global
tags: noticias artículos feed leer
---

# Noticias

Listado: `/{serie}/noticias` (F1 también `/noticias`).

Detalle: `/{serie}/noticias/:id`

Artículos en Postgres (RSS sincronizado). Si no hay noticias, puede faltar sync en el servidor (`npm run db:sync:news`).

API: `GET /api/news/feed/:category`
