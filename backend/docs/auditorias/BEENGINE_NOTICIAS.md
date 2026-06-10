---
slug: recoleccion-noticias
title: Sistema de Recolección de Noticias
scope: backend
tags: noticias rss parser sync scraping arquitectura feed
---

# Sistema de Recolección de Noticias

Para recoger las noticias en **BeEngine**, el sistema no utiliza una API de pago (como NewsAPI o similares), sino que implementa **su propio sistema de recolección a través de fuentes RSS**.

## 1. Fuentes RSS por Categoría
En el archivo `backend/src/data/shared/newsFeeds.config.js` se define un diccionario de fuentes RSS clasificadas por categoría del motor (F1, F2, F3, MotoGP, Moto2, Moto3). 
Las fuentes utilizadas son medios especializados, entre los que se incluyen:
- **BBC Sport** (`feeds.bbci.co.uk`)
- **Crash.net** (`crash.net/rss`)
- **Formula 1 Oficial** (`formula1.com/en/latest/all.xml`)
- **Motorsport.com** (`motorsport.com/rss`)

## 2. Parser RSS Personalizado
El proyecto cuenta con un parser propio y ligero en `backend/src/utils/rssParser.js` que procesa el XML de las fuentes RSS **sin usar dependencias externas**. 

Este parser se encarga de extraer:
- Título, descripción y enlace directo de la noticia.
- Fecha de publicación y creador/autor.
- Imágenes multimedia (buscando y decodificando etiquetas como `enclosure` o `media:thumbnail`).

## 3. Servicio de Enriquecimiento e Inferencia (`newsFeed.service.js`)
Durante el procesamiento de los artículos recabados, el servicio realiza mejoras de forma automática:
- **Filtros cruzados:** Para categorías menores (ej. F2 o Moto3), el sistema verifica que el enlace o la categoría de la noticia contenga palabras clave obligatorias. Esto evita que noticias de la categoría reina se mezclen en los feeds equivocados.
- **Etiquetado automático (Tags):** Mediante el uso de expresiones regulares sobre el título y la descripción, a cada noticia se le asigna un "Tag" identificativo (`ENTREVISTA`, `MERCADO`, `RESULTADOS`, `TÉCNICA`, `PADDOCK` o `ANÁLISIS`).
- **Extracción de OpenGraph (OG):** Si el RSS no devuelve una imagen principal, el backend realiza una petición rápida (Fetch) a la URL de la noticia original. Allí lee los metadatos HTML para extraer la imagen destacada (etiquetas `og:image` o `twitter:image`).

## 4. Caché y Base de Datos (Persistencia)
Existen dos vías para procesar y servir estas noticias a la interfaz:

1. **Cronjob de sincronización (`sync-news.mjs`):** Un script que se ejecuta periódicamente de forma automática (o usando el comando `npm run db:sync:news`). Se conecta a la base de datos y usa `prisma.newsArticle.upsert` para descargar los últimos RSS y guardarlos de manera persistente.
2. **Caché en Memoria (Live Polling):** Si la base de datos de PostgreSQL está desactivada o falla, el backend puede realizar el recabado (Fetch) de los RSS en vivo bajo demanda cuando el frontend lo solicita. Para evitar sobrecargar a los medios originales (y para mejorar los tiempos de respuesta), el sistema guarda temporalmente el resultado en una caché en memoria.
