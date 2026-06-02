---
slug: live-timing
title: Live timing (F1 y MotoGP)
scope: global
tags: live directo timing en vivo sesión fp qualifying race
---

# Live timing

Solo **Formula 1** y **MotoGP** tienen experiencia live dedicada en la app.

## Formula 1

- **Ruta**: `/f1/live`
- Datos en tiempo real vía **OpenF1** cuando hay sesión.
- Desde la home, el banner «EN VIVO» enlaza aquí.
- Muestra tiempos de vuelta, posiciones, etc., según disponibilidad de la API externa.

## MotoGP

- **Hub**: `/motogp/live` — entrada al fin de semana.
- **Por GP y sesión**: `/motogp/calendario/:race/:session` — feed live de Pulse Live (FP1, FP2, FP3, Q1, Q2, Sprint, Race… según el evento).
- Home MotoGP puede enlazar al live cuando hay sesión activa.

## F2, F3, Moto2, Moto3

**No** tienen página `/live` global. Los resultados se consultan en el **calendario** → evento → sesión (vista de resultados, no timing continuo tipo F1).

## Fuera de horario

Si no hay sesión en curso, las páginas live pueden estar vacías o mostrar estado inactivo; no es un error de login.
