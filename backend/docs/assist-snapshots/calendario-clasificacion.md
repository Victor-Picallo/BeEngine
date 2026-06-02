---
slug: calendario-clasificacion
title: Calendario y clasificación
scope: global
tags: calendario clasificación standings gp ronda resultados
---

# Calendario y clasificación

## Calendario

Ruta: `/{serie}/calendario`

- Lista de rondas / Grandes Premios del campeonato.
- Cada evento enlaza a resultados o sesiones según la serie:
  - **F1**: sesiones FP1–FP3, clasificación, carrera (`/f1/calendario/:race/:session`).
  - **F2/F3/Moto**: misma idea con página feeder de resultados.
  - **MotoGP**: sesiones pueden abrir live feed.

Los circuitos pueden mostrar trazado SVG o imagen si están enriquecidos en la base de datos.

## Clasificación

Ruta: `/{serie}/clasificacion`

- **Campeonato de pilotos**: posición, puntos, victorias.
- **Campeonato de equipos/constructores**: paralelo en la misma página o pestañas según el diseño de la serie.

Los puntos se actualizan cuando el backend sincroniza resultados tras cada carrera.

## API

- Calendario: rutas `jolpica/calendar` (fórmula) o `pulselive/...` (moto) bajo `/api/{serie}/`.
- Standings: `driver-standings`, `constructor-standings`.

## Consulta habitual

«¿Cuándo es la próxima carrera?» → mirar **Inicio** (countdown) o **Calendario** de la categoría elegida en el topbar.
