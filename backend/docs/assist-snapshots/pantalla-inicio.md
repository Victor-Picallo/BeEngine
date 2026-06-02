---
slug: pantalla-inicio
title: Pantalla de inicio (home)
scope: global
tags: home inicio próxima carrera countdown podio clasificación
---

# Pantalla de inicio

Cada categoría tiene una **home** al pulsar «Inicio» en el sidebar:

- F1: `/` o `/f1`
- F2: `/f2`, F3: `/f3`, MotoGP: `/motogp`, etc.

## Elementos habituales

1. **Cabecera** — nombre de la categoría, badge «Temporada 2026», indicador de fuente de datos.
2. **Progreso de temporada** — rondas completadas vs total (barra y puntos).
3. **Próxima carrera** — nombre del GP, circuito, fecha, cuenta atrás (días/horas/minutos).
4. **Última carrera** — resultado resumido, podio (P1–P3).
5. **Clasificación** — top pilotos del campeonato con enlace a clasificación completa.
6. **Noticias** — últimos titulares con enlace a la sección Noticias.

## Banner en vivo

Si hay sesión activa según el API, banner **EN VIVO** con enlace a Live (F1 o MotoGP).

## Carga y errores

- Mientras carga: mensaje «Cargando datos…».
- Si falla el API: mensaje de error en la zona principal.
- Los datos vienen de `GET /api/home/:category` (category = f1, f2, f3, motogp, moto2, moto3).

## Cambiar de categoría

Desde el topbar sin perder el concepto de «inicio»: cada serie tiene su propia home independiente.
