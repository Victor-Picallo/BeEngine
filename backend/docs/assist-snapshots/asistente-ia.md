---
slug: asistente-ia
title: Asistente de ayuda (chat IA)
scope: global
tags: ayuda chat asistente bot groq preguntas
---

# Asistente de ayuda

## Dónde está

Botón flotante **abajo a la derecha** (icono de chat amarillo). Visible en todas las páginas excepto `/login`.

## Qué hace

- Responde preguntas sobre **cómo usar BeEngine**: rutas, secciones, cuenta, live, datos.
- Usa documentación interna (snapshots) cargada en el servidor, **no** resultados en vivo de la pista.
- El contexto se adapta a la sección en la que estás (F1, MotoGP, etc.) para priorizar documentos de esa serie.

## Cómo preguntar

Ejemplos útiles:

- «¿Cómo veo el calendario de MotoGP?»
- «¿Dónde está el live de F1?»
- «¿Cómo guardo un piloto favorito?»
- «¿De dónde salen los datos?»

## Datos deportivos (clasificación, líder, calendario)

Para preguntas como «¿quién va primero en F1?», «clasificación», «próxima carrera» o «última carrera», el servidor **inyecta datos actuales** desde la misma base de datos / APIs que usa la app (bloque «DATOS ACTUALES BEENGINE»). No hace falta subir eso como snapshot manual.

## Límites

- El timing vuelta a vuelta en directo sigue en `/f1/live` o `/motogp/live`, no en el chat.
- Si el servidor no tiene `GROQ_API_KEY` o base de datos, dirá que no está disponible.
- Límite de preguntas por minuto (rate limit) para evitar abuso.

## Fuentes en la respuesta

A veces verás «Basado en: …» con el título de los documentos usados.

## Mantenimiento (equipo técnico)

Los textos se suben a la tabla `assist_knowledge_snapshots` con `npm run assist:snapshot:seed` desde archivos en `backend/docs/assist-snapshots/`.
