---
slug: interfaz-navegacion
title: Interfaz — sidebar y topbar
scope: global
tags: sidebar menú navegación topbar secciones categorías
---

# Cómo navegar en BeEngine

## Barra superior (topbar)

- Muestra el logo y enlaces a cada **categoría**: F1, F2, F3, MotoGP, Moto2, Moto3.
- Al pulsar una categoría, cambias el contexto de toda la app a esa serie.
- El enlace «home» de la categoría lleva a `/` para F1 o a `/f2`, `/f3`, `/motogp`, etc. para el resto.

## Barra lateral (sidebar)

Secciones habituales (pueden variar ligeramente en moto: «Equipos» en lugar de «Escuderías»):

| Sección | Descripción |
|---------|-------------|
| **Inicio** | Home de la categoría activa |
| **Noticias** | Listado de artículos |
| **Calendario** | Grandes Premios / rondas del campeonato |
| **Pilotos** | Grid o listado; clic abre ficha |
| **Escuderías / Equipos** | Constructores o equipos |
| **Clasificación** | Campeonato de pilotos y equipos |

## Bloque «Tus favoritos» (con sesión)

Si has iniciado sesión (`/login`):

- Verás hasta dos accesos rápidos: **categoría favorita** y **piloto favorito** elegidos en el registro u onboarding Google.
- Si no hay sesión, el bloque invita a «Iniciar sesión».

## Bloque «Conectado como»

Al final del sidebar: nombre de usuario y botón **Cerrar sesión**.

## Banner «EN VIVO»

En la home, si hay sesión en directo, aparece un banner amarillo/acento con enlace **Ver Live** (F1 o MotoGP según la serie).
