---
slug: noticias
title: Noticias
scope: global
tags: noticias artículos feed leer
---

# Noticias en BeEngine

## Acceso

- Por categoría: `/f1/noticias`, `/f2/noticias`, … `/motogp/noticias`, etc.
- Ruta global F1 también: `/noticias` y `/noticias/:articleId` (redirige o sirve F1 según implementación).

## Listado

- Tarjetas con imagen, título, fecha, tags si existen.
- Filtro por categoría vía query `?cat=` en algunas vistas moto/noticias cruzadas.

## Detalle

- Ruta tipo `/f1/noticias/:articleId` — cuerpo del artículo, imagen destacada.
- Los artículos viven en PostgreSQL (`news_articles`), sincronizados para **F1 y MotoGP** (según configuración del proyecto).

## Si no hay noticias

Puede deberse a que el sync de noticias no se ha ejecutado (`npm run db:sync:news` en el servidor) o no hay artículos para esa categoría.

## API

- `GET /api/news/:category` — listado.
- `GET /api/news/article/:articleId` — detalle.
