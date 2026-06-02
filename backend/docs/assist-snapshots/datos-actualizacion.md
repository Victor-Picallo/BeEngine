---
slug: datos-actualizacion
title: De dónde salen los datos
scope: global
tags: datos api base de datos sync refresh fuentes
---

# Origen y actualización de datos

BeEngine muestra datos desde un **API backend** (`/api/...`) que combina:

- **PostgreSQL (Supabase)** — calendarios, standings, perfiles enriquecidos, noticias, medios (URLs de imágenes en Storage).
- **APIs externas en vivo o bajo demanda** — según categoría y configuración del servidor.

## Fuentes por categoría (resumen)

| Serie | Fuente principal | Notas |
|-------|------------------|--------|
| F1 | Jolpica/Ergast + OpenF1 | Live timing OpenF1; perfiles enriquecidos en DB |
| F2 / F3 | FIA (web oficial) + DB | Calendario/resultados; fallback si falla red |
| MotoGP | Pulse Live + DB | Live en fin de semana; sync a DB |
| Moto2 / Moto3 | Pulse Live + DB | Similar a MotoGP sin página live dedicada en app |

## Badge «Datos en caché»

En la home puede aparecer un indicador de si los datos vienen de caché/DB o de fuente en vivo. No significa que estén desactualizados necesariamente.

## Actualización (equipo / servidor)

Tras cada Gran Premio el mantenedor suele ejecutar en el backend:

- `npm run refresh` — sync completo F1+F2+F3+Moto + medios.
- `npm run refresh:weekend` — solo standings y resultados recientes.

La app **no** actualiza sola la base de datos; depende de esos procesos.

## Medios (fotos, logos, circuitos)

- URLs públicas desde **Supabase Storage** (bucket `beengine-media`).
- El frontend **no** usa carpetas locales de equipos; todo viene del API.

## Datos en el asistente de ayuda

- **Documentación** (snapshots / guía `beengine-completo`): cómo usar la app.
- **Datos deportivos actuales** (automático por pregunta): líderes, equipos, próxima y última carrera desde la misma DB/API que la app. Si preguntan por **todas las categorías** o desde scope global sin serie concreta, se inyecta resumen de F1, F2, F3, MotoGP, Moto2 y Moto3.
- **Noticias** (automático si preguntan por noticias/titulares): últimos titulares RSS/BD por categoría.
- **Búsqueda de piloto** por nombre en las clasificaciones cuando el mensaje parece referirse a un piloto concreto.
- **No** incluye timing vuelta a vuelta en directo; eso está en `/f1/live` y `/motogp/live`.
