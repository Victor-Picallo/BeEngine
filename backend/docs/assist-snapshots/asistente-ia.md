---
slug: asistente-ia
title: Asistente de ayuda (chat IA)
scope: global
tags: ayuda chat asistente bot groq preguntas
---

# Asistente de ayuda

Botón flotante **abajo a la derecha** (chat amarillo). Visible en todas las páginas excepto `/login`.

## Qué responde

- Cómo usar BeEngine: rutas, secciones, cuenta, live.
- Clasificación, líder, próxima/última carrera (datos actuales de la misma DB/API que la app).
- Noticias recientes si preguntas por titulares.

## Qué no hace

- Timing vuelta a vuelta → usa `/f1/live` o `/motogp/live`.
- Necesita `GROQ_API_KEY` y base de datos en el servidor.

## Ejemplos

- «¿Cómo veo el calendario de MotoGP?»
- «¿Dónde está el live de F1?»
- «¿Cómo guardo un piloto favorito?»
