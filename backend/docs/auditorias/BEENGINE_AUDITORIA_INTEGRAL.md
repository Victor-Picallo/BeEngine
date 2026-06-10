# BeEngine — Auditoría Técnica Integral

## 1. Visión General del Producto

**BeEngine** es un hub web de motorsport que reúne datos de seis series: F1, F2, F3, MotoGP, Moto2 y Moto3.

Ofrece una experiencia integral que incluye:
- Calendarios, horarios y resultados (Live Timing)
- Clasificaciones de pilotos y equipos (Standings)
- Perfiles de pilotos y noticias/feed de actualidad
- Un **Asistente IA integrado** para consultas contextuales
- Rutas de aplicación por serie y secciones dedicadas (UI multiserie)

El objetivo es presentar un producto global de motorsport con datos reales, tolerante a fallos y con capacidades de búsqueda/consulta avanzada.

---

## 2. Arquitectura Global

### 2.1. Estructura del Repositorio
```text
BeEngine/
├── backend/    # API REST, Sincronización, y lógica del Asistente IA
└── frontend/   # Aplicación web en Angular (UI)
```

### 2.2. Tecnologías Principales
- **Backend:** Node.js 20+, Express 5, Prisma ORM
- **Frontend:** Angular 21 (Standalone Components), RxJS, TailwindCSS
- **Base de Datos & Auth:** Supabase (Postgres, Auth, Storage)
- **Asistente IA:** Groq API (llama-3.3-70b-versatile)
- **Fuentes Externas:** Jolpica, OpenF1, Pulse Live, FIA, APIs de Noticias (RSS)

---

## 3. Capa Backend (API & Sincronización)

El backend expone una API REST y actúa como orquestador de datos y proveedor del asistente IA.

### 3.1. Componentes Clave
- `server.js` y `app.js`: Entrypoints y configuración de Express/CORS.
- `routes/` y `controllers/`: Manejo de endpoints (`/api/landing`, `/api/f1`, `/api/assist/chat`, etc.).
- `services/`: Lógica de negocio (orquestación deportiva, lógica del IA).
- `repositories/`: Acceso a Postgres mediante Prisma.
- `scripts/`: Tareas de mantenimiento, sincronización (refresh) de datos de series y actualización de Knowledge Snapshots.

### 3.2. Sincronización de Datos (Resiliencia)
Para asegurar que la app funcione incluso si las APIs externas fallan, el backend tiene scripts (`refresh-all.mjs`, `sync-f1.mjs`, etc.) que guardan snapshots de datos deportivos y noticias en la BD. La app hace fallback automático a la BD si el endpoint externo no responde.

---

## 4. Capa Frontend (UI)

La aplicación Angular es el punto de interacción del usuario y consume la API del backend.

### 4.1. Diseño y Enrutado
- **Standalone Components** y ChangeDetection `OnPush` para alto rendimiento.
- Enrutado perezoso (lazy loading) por serie (rutas de F1, MotoGP, etc.).
- **Paleta de Series:** Configuración centralizada de colores (`f1: #FFD100`, `motogp: #0052CC`, etc.) que colorean dinámicamente tarjetas, encabezados y menús.

### 4.2. Flujos Clave en la UI
- **Landing Dinámico:** Mezcla datos estáticos, resultados en vivo (standings), calendario y noticias cruzadas (F1 + MotoGP).
- **Perfiles de Pilotos:** Manejo de imágenes con URLs estáticas de Supabase o fallbacks dinámicos.
- **Interacción IA:** Chat flotante integrado que consulta a `/api/assist/chat`.

---

## 5. El Asistente IA Integrado (Motor de Contexto)

El asistente IA es un sistema avanzado de **procesamiento contextual multi-fuente** (RAG rudimentario y llamadas a APIs en vivo).

### 5.1. Flujo de Procesamiento (`/api/assist/chat`)
Cuando el usuario envía una pregunta (ej: *"¿Dónde está Alonso?"*):

1. **Detección de Intención:** Se analiza si es pregunta de navegación (cómo usar la app) o deportiva.
2. **Paralelización de Fuentes (Contexto):** Se recogen simultáneamente hasta 3 fuentes:
   - **Live Context:** Consulta las clasificaciones, calendarios y última carrera en tiempo real mediante las APIs externas (Jolpica, Pulse Live) o la BD.
   - **News Context:** Busca en la BD de noticias titulares recientes relevantes.
   - **Knowledge Snapshots:** Documentos estáticos Markdown guardados en la BD (ej. *F1 2026 Season Data*, *Rutas de la app*) con un sistema de scoring por relevancia de palabras clave.
3. **Gestión de Budget:** Groq tiene un límite, por lo que el asistente asigna hasta `12000` caracteres (variable de entorno) entre las fuentes. Si Live+News usan 5000, los Snapshots pueden usar hasta 7000.
4. **Construcción del Prompt:** Se inyecta todo este contexto junto con un *System Prompt* estricto (que prohíbe inventar cifras y obliga a usar la data proveída) y la historia de chat.
5. **Llamada a Groq LLM:** Usa el modelo `llama-3.3-70b-versatile` con `temperature: 0.35` (determinístico y conservador) para generar la respuesta.
6. **Respuesta al Frontend:** Se devuelve la respuesta del LLM más las fuentes (`sources`) usadas para dar contexto de confianza al usuario.

### 5.2. Limitaciones Actuales de la IA
- Carece de búsqueda semántica real (usa token matching).
- No tiene resultados históricos carrera por carrera a menos que se carguen explícitamente en un Knowledge Snapshot.
- Las APIs de terceros (Pulse Live) pueden rate-limitearse.

---

## 6. Flujo de Datos End-to-End en BeEngine

1. El usuario navega por BeEngine (UI Angular).
2. Se cargan datos de Landing y páginas de Series consultando al Backend.
3. El Backend trae datos en cache (Postgres) o de APIs externas. Las imágenes cargan desde Supabase Storage.
4. El usuario abre el chat y pregunta algo.
5. El Backend intercepta, extrae intenciones, hace un fetch paralelo a APIs deportivas, noticias y documentos estáticos.
6. El LLM sintetiza la respuesta basándose **únicamente** en los datos reales proveídos en ese mismo instante.
7. La UI renderiza la respuesta con sus citas (sources).

---

## 7. Mantenimiento, Ejecución y Operaciones

### 7.1. Comandos de Ejecución
- **Backend:** `cd backend && npm install && npm run dev`
- **Frontend:** `cd frontend && npm install && ng serve`

### 7.2. Tareas Críticas (Scripts)
- `npm run refresh:all` (Backend): Actualiza caché de carreras y posiciones en DB.
- `npm run assist:snapshot:upsert` (Backend): Sube un nuevo archivo Markdown a la Base de Datos para que el Asistente IA lo pueda leer y entender.
- `npm run assist:snapshot:seed` (Backend): Carga de forma masiva los conocimientos de IA iniciales.

### 7.3. Variables de Entorno y Configuración
El sistema depende fuertemente del archivo `.env` en el backend:
- Accesos a Supabase (`SUPABASE_URL`, `DATABASE_URL`, claves JWT)
- Configuración del Asistente (`GROQ_API_KEY`, `ASSIST_ENABLED`, `ASSIST_MAX_SNAPSHOT_CHARS`)
- Configuración de APIs deportivas (`JOLPICA_F1_ENABLED`, etc.)

---

## 8. Conclusiones

**BeEngine no es un simple CRUD ni un wrapper visual.**
Es una plataforma distribuida que resuelve tres problemas técnicos complejos:
1. **Orquestación y Consolidación de Datos:** Integra múltiples APIs dispares (Jolpica, OpenF1, FIA, Pulse Live, Open-Meteo, RSS) en un solo formato homogéneo.
2. **Resiliencia (Tolerancia a fallos):** Tiene mecanismos de caché/sync automatizados en base de datos para funcionar si las fuentes caen.
3. **IA Generativa y Contextual (RAG):** El Asistente no es un bot tonto, sino un sistema que arma dinámicamente el contexto en vivo, forzando al LLM a dar datos 100% reales y actualizados, además de orientar al usuario en la propia UI.
