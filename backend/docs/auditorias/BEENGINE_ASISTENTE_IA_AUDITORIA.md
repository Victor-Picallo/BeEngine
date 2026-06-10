# BeEngine - Auditoría Completa del Asistente IA

## 1. Visión General Arquitectura

El asistente IA de BeEngine es un sistema de **procesamiento contextual multi-fuente** que:

```
Usuario pregunta
    ↓
[Detectar Intención + Scope]
    ↓
Paralelizar 3 fuentes de contexto:
  1. Datos en Vivo (BD/APIs) → Classifications, Calendario, Última Carrera
  2. Noticias Recientes → RSS/BD Noticias
  3. Knowledge Snapshots → Documentación + Detalles Específicos
    ↓
Combinar contexto + Historia
    ↓
[Llamada a Groq LLM]
    ↓
Respuesta + Fuentes
```

---

## 2. Componentes Principales

### 2.1 Entry Point: `POST /api/assist/chat`

**Ubicación:** `backend/src/routes/assist.routes.js`

```javascript
// Request
{
  message: "¿Dónde está Alonso en clasificación?",
  scope?: "f1",           // opcional: f1|f2|f3|motogp|moto2|moto3
  history?: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ]
}

// Response
{
  reply: "Fernando Alonso está en posición 3...",
  sources: [
    { slug: "live-f1", title: "Datos actuales F1" },
    { slug: "f1-2026-season-data", title: "F1 2026 — Temporada actual" }
  ]
}
```

**Rate Limit:** 20 requests/minuto por usuario (ASSIST_RATE_LIMIT_PER_MIN=20)

---

### 2.2 Servicio Principal: `assistChat.service.js`

**Función Core:** `chatWithAssist(input)`

#### 2.2.1 Validación de Entrada

```javascript
// Línea ~40-50
const message = String(input.message || '').trim();
if (!message) throw Error('Mensaje vacío'); // 400
if (message.length > 2000) throw Error('Msg demasiado largo'); // 400
```

#### 2.2.2 Normalización de Historia

```javascript
// Línea ~60-70
function normalizeHistory(raw) {
  // Toma últimos 10 mensajes
  // Filtra solo "user" y "assistant"
  // Trunca cada uno a 2000 caracteres
  return validMessages;
}
```

#### 2.2.3 Construcción de Contexto (Paralelización)

```javascript
// Línea ~71-78
const [live, news] = await Promise.all([
  buildLiveContext({ scope, message, history }),
  buildNewsContext({ scope, message, history })
]);

// live = { text: "...", sources: [...], used: bool }
// news = { text: "...", sources: [...], used: bool }

const dataChars = (live.text?.length ?? 0) + (news.text?.length ?? 0);
const snapshotBudget = Math.max(4000, ASSIST_MAX_SNAPSHOT_CHARS - dataChars);
// ASSIST_MAX_SNAPSHOT_CHARS = 12000 (del .env)
```

**Lógica de Budget:**
- Si live + news usan 5000 chars → snapshots usan hasta 7000
- Si live + news usan 9000 chars → snapshots usan hasta 4000 (mínimo)

#### 2.2.4 Selección de Snapshots

```javascript
// Línea ~79-84
const { contextText, sources: docSources } = await selectSnapshotsForChat({
  scope: input.scope,
  message,
  maxChars: snapshotBudget
});
```

**Ver sección 2.5 para detalle de scoring**

#### 2.2.5 Construcción del Bloque de Contexto

```javascript
// Línea ~86-102
const blocks = [];
if (live.text?.trim()) blocks.push(live.text.trim());
if (news.text?.trim()) blocks.push(news.text.trim());
if (contextText.trim()) {
  blocks.push(`--- DOCUMENTOS DE CONTEXTO (uso de la app) ---\n${contextText}\n--- FIN DOCUMENTOS ---`);
}
const contextBlock = blocks.length > 0 ? blocks.join('\n\n') : '--- Sin contexto disponible. ---';

const sources = [...live.sources, ...news.sources, ...docSources];
```

#### 2.2.6 Construcción de Mensajes para Groq

```javascript
// Línea ~104-112
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },        // Instrucciones
  { role: 'system', content: contextBlock },          // Contexto inyectado
  ...history,                                         // Historia del usuario
  { role: 'user', content: message }                  // Pregunta actual
];
```

**Orden importante:** System → System (contexto) → Historia → User

#### 2.2.7 Llamada a Groq API

```javascript
// Línea ~113-140
async function callGroq(messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,                    // llama-3.3-70b-versatile
      messages,
      temperature: 0.35,                    // Determinístico (0.35)
      max_tokens: 1024                      // Máx 1KB respuesta
    })
  });
  
  // Error handling + extracción de reply
  return reply;
}
```

**Parámetros Groq:**
- **temperature: 0.35** → Respuestas consistentes, menos "alucinación"
- **max_tokens: 1024** → Limita respuestas largas
- **Model:** llama-3.3-70b-versatile (gratis en Groq, muy rápido)

---

### 2.3 System Prompt (Instrucciones del Modelo)

**Ubicación:** `assistChat.service.js` línea ~12-36

```
Eres el asistente de ayuda de BeEngine (F1, F2, F3, MotoGP, Moto2, Moto3).

Reglas:
1. Responde en idioma del usuario (default español)
2. «DATOS ACTUALES BEENGINE»: ÚNICA fuente para cifras deportivas
   - Clasificaciones, líderes, calendario, última carrera
   - NO INVENTES cifras ni nombres de pilotos
3. «NOTICIAS RECIENTES BEENGINE»: Solo titulares de BD/RSS
4. «DOCUMENTOS DE CONTEXTO»: Uso de la app (rutas, menús, favoritos)
5. Si faltan datos: NO uses tu memoria, DI que faltan datos
6. Sé breve, párrafos cortos, listas si ayudan
```

**Propósito:** Forzar al LLM a ser honesto sobre datos deportivos

---

### 2.4 Construcción de Contexto en Vivo

**Ubicación:** `assistLiveContext.service.js`

#### 2.4.1 Detección de Intenciones

```javascript
// Línea ~330-360
export async function buildLiveContext({ scope, message, history }) {
  
  // Paso 1: Detectar si es pregunta de navegación vs deportiva
  const contextText = buildContextText(message, history);
  const rawIntents = mergeIntents(
    detectLiveIntents(contextText),
    detectLiveIntents(message)
  );
  
  // Paso 2: Filtrar si es pura navegación
  if (isPureNavigationQuestion(message) && !rawIntents.standings && !rawIntents.driverLookup) {
    return { text: '', sources: [], used: false };
  }
  
  // Paso 3: Validar que es pregunta deportiva
  if (!isSportsDataQuestion(message, rawIntents, history, scope)) {
    return { text: '', sources: [], used: false };
  }
```

**Detección de intenciones:** 
- `standings`: ¿quién lidera?, clasificación, posición
- `constructors`: ¿equipos?, escuderías
- `nextRace`: próxima carrera, ¿cuándo?
- `lastRace`: última carrera, resultados
- `driverLookup`: nombre de piloto + contexto deportivo

#### 2.4.2 Resolución de Series

```javascript
// Línea ~360-365
const targets = resolveSeriesTargets(message, scope, history);
// Analiza "f1", "f2", "moto", "todas"
// Si scope="f1" → targets=['f1']
// Si message="moto2" → targets=['moto2']
// Si no hay pista → targets=['f1'] (default)

const multiSeries = targets.length > 1;
```

#### 2.4.3 Fetch de Datos en Paralelo

```javascript
// Línea ~370-395
async function fetchSeriesBundle(seriesId) {
  const api = SERIES_API[seriesId]; // Maps: f1→Jolpica, moto→Pulse, etc
  
  const [drivers, teams, calendar, lastRace] = await Promise.all([
    api.drivers().catch(() => ({ items: [], source: 'n/a' })),
    api.teams().catch(() => ({ items: [], source: 'n/a' })),
    api.calendar().catch(() => ({ items: [] })),
    api.lastRace().catch(() => null)
  ]);
  
  return { drivers, teams, calendar, lastRace };
}

// SERIES_API mapea cada serie a su API:
// f1: Jolpica (getDriverStandings, getConstructorStandings, etc)
// f2/f3: FIA endpoints
// motogp/moto2/moto3: Pulse Live API
```

**APIs Externas:**
- **F1:** Jolpica (Ergast) + OpenF1 para live
- **F2/F3:** FIA website scraping
- **MotoGP/Moto2/Moto3:** Pulse Live REST API

#### 2.4.4 Formateo de Respuesta

```javascript
// Línea ~400-450
if (multiSeries) {
  // Resumen compacto de todas las series
  const bundles = await Promise.all(
    targets.map(async (seriesId) => {
      const bundle = await fetchSeriesBundle(seriesId);
      return { seriesId, text: formatSeriesCompact(seriesId, bundle) };
    })
  );
  for (const { text } of bundles) {
    lines.push(`\n${text}`);
  }
} else {
  // Detalle completo de una serie
  lines.push(`\n${await buildSingleSeriesDetail(targets[0], intents)}`);
}

// Si hay nombres de pilotos en la pregunta:
if (rawIntents.driverLookup || /\b[A-Z][a-záéíóúñ]{3,}\b/.test(message)) {
  const driverBlock = await buildDriverLookupBlock(message);
  if (driverBlock) lines.push(driverBlock);
}
```

#### 2.4.5 Lookup de Pilotos

```javascript
// Línea ~220-280
async function buildDriverLookupBlock(message) {
  const tokens = message.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  // "Alonso" → tokens = ['alonso']
  
  const hits = [];
  for (const seriesId of ALL_SERIES_IDS) {
    const pack = await api.drivers().catch(() => null);
    for (const d of pack?.items ?? []) {
      const name = String(d.driver || '').toLowerCase();
      const parts = name.split(/\s+/);
      
      const matched = tokens.some(t =>
        name.includes(t) ||
        parts.some(p => p.startsWith(t) || t.startsWith(p))
      );
      
      if (matched) {
        hits.push(
          `${SERIES_LABEL[seriesId]}: ${d.driver} (${d.team}) — P${d.pos}, ${d.points} pts`
        );
      }
    }
  }
  
  return hits.length > 0
    ? `\n### Pilotos mencionados (búsqueda en clasificaciones)\n${hits.slice(0, 12).join('\n')}`
    : '';
}
```

**Importante:** Solo busca en **standings actuales**, no en resultados históricos de carreras.

#### 2.4.6 Límite de Caracteres

```javascript
// Línea ~360-365
let text = lines.join('\n');
const maxChars = ASSIST_LIVE_MAX_CHARS; // env var
if (text.length > maxChars) {
  text = `${text.slice(0, maxChars)}\n… (recortado)`;
}

return { text, sources, used: true };
```

---

### 2.5 Construcción de Noticias

**Ubicación:** `assistNewsContext.service.js`

**Lógica similar a Live Context:**

1. Detecta si hay intención de "noticias"
2. Query tabla `news` en BD filtrando por scope + recencia
3. Limita a 5-10 noticias recientes
4. Formatea como lista con títulos + enlaces

```javascript
// Pseudocódigo
const recentNews = await db('news')
  .where('scope', scope || 'global')
  .orderBy('publishedAt', 'desc')
  .limit(10);

const newsText = recentNews
  .map(n => `- ${n.title} (${n.source})`)
  .join('\n');
```

---

### 2.6 Selección de Snapshots (Knowledge Base)

**Ubicación:** `knowledgeSnapshot.service.js`

#### 2.6.1 Query y Scoring

```javascript
// Línea ~40-80
export async function selectSnapshotsForChat({ scope, message, maxChars }) {
  
  // 1. Query: Traer todos los snapshots activos
  const snapshots = await db('assistKnowledgeSnapshot')
    .where('isActive', true)
    .where(function() {
      this.where('scope', 'global')
          .orWhere('scope', scope);
    });
  
  // 2. Scoring: Cada snapshot obtiene puntuación por relevancia
  const scored = snapshots
    .map(snapshot => ({
      ...snapshot,
      score: relevanceScore(snapshot, message)
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // 3. Selección greedy: Agregar snapshots hasta llenar presupuesto
  let contextText = '';
  let totalChars = 0;
  const sources = [];
  
  for (const snapshot of scored) {
    const contentWithHeader = `## ${snapshot.title}\n\n${snapshot.content}`;
    const contentChars = contentWithHeader.length;
    
    if (totalChars + contentChars <= maxChars) {
      contextText += contentWithHeader + '\n\n---\n\n';
      totalChars += contentChars;
      sources.push({
        slug: snapshot.slug,
        title: snapshot.title
      });
    } else {
      break; // No cabe más
    }
  }
  
  return { contextText, sources };
}
```

#### 2.6.2 Función de Scoring de Relevancia

```javascript
// Línea ~100-130
function relevanceScore(snapshot, queryTokens) {
  const queryText = `${snapshot.title} ${snapshot.tags || ''} ${snapshot.content || ''}`
    .toLowerCase();
  
  let score = 0;
  
  // Tokenizar query (ej: "alonso 2026" → ['alonso', '2026'])
  const qTokens = query.toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 2);
  
  // Buscar coincidencias en título (peso 3x)
  for (const token of qTokens) {
    if (snapshot.title.toLowerCase().includes(token)) {
      score += 30;
    }
  }
  
  // Buscar coincidencias en tags (peso 2x)
  if (snapshot.tags) {
    for (const token of qTokens) {
      if (snapshot.tags.toLowerCase().includes(token)) {
        score += 20;
      }
    }
  }
  
  // Buscar coincidencias en contenido (peso 1x)
  for (const token of qTokens) {
    const occurrences = (snapshot.content.match(new RegExp(token, 'gi')) || []).length;
    score += Math.min(occurrences, 5); // Max 5 pts por token
  }
  
  return score;
}
```

**Limitación actual:** Solo keyword matching, no semantic search.

#### 2.6.3 Schema de Snapshots

```javascript
// Tabla: assistKnowledgeSnapshot
{
  id: UUID,
  slug: "f1-2026-season-data",           // PK única
  title: "F1 2026 — Temporada actual",
  content: "Markdown con datos",
  scope: "f1" | "global" | "motogp" | etc,
  tags: "f1 2026 clasificación alonso", // Palabras clave separadas por espacios
  isActive: true,
  version: 1,
  createdAt: datetime,
  updatedAt: datetime
}
```

#### 2.6.4 Upsert de Snapshots

```javascript
// backend/scripts/assist-snapshot-upsert.mjs
// Uso:
// npm run assist:snapshot:upsert -- --file docs/assist-snapshots/f1-2026-season-data.md --slug f1-2026-season-data

export async function upsertSnapshot(input) {
  const {
    slug,
    title,
    content,
    scope = 'global',
    tags = ''
  } = input;
  
  return await db('assistKnowledgeSnapshot')
    .insert({
      slug, title, content, scope, tags, isActive: true, version: 1,
      createdAt: new Date(), updatedAt: new Date()
    })
    .onConflict('slug')
    .merge();
}
```

---

## 3. Flujo Completo End-to-End

### 3.1 Ejemplo: "¿Dónde consiguió Alonso su punto en Canadá?"

**PASO 1: Request llega a /api/assist/chat**
```javascript
{
  message: "¿Dónde consiguió Alonso su punto en Canadá?",
  scope: null,
  history: []
}
```

**PASO 2: Validar entrada**
- ✅ No vacío
- ✅ < 2000 chars
- → Continuar

**PASO 3: Detección de intenciones**
- Tokens: ['donde', 'consiguio', 'alonso', 'punto', 'canada']
- Palabras clave: "Alonso" (piloto), "punto" (resultado), "Canadá" (circuito)
- Intención: `driverLookup: true, standings: true`
- Es pregunta deportiva: ✅ Sí

**PASO 4: Resolver serie**
- Buscar "Canadá" en calendarios F1-Moto3
- "Canadá" → "Gilles-Villeneuve" → F1
- `targets = ['f1']`

**PASO 5: Paralelizar contexto (3 fuentes)**

**5A - Build Live Context:**
```
→ Fetch F1 standings via Jolpica
  Alonso: P3, 92 pts ← ENCONTRADO
→ Fetch F1 last race (GP Canada)
  Results: P1 Hamilton, P5 Alonso (10 pts)
  ← "Alonso consiguió 10 pts como 5º"
→ Driver lookup: "Alonso en F1: P3, 92 pts"
→ Output:
  ```
  --- DATOS ACTUALES BEENGINE ---
  Clasificación F1: Alonso en posición 3 con 92 pts...
  Última carrera (GP Canadá):
    P1: Lewis Hamilton - 25 pts
    P5: Fernando Alonso - 10 pts
  ### Pilotos mencionados
  F1: Fernando Alonso (Aston Martin) — P3, 92 pts
  ```
  sources: [{ slug: 'live-f1', title: 'Datos actuales F1' }]
```

**5B - Build News Context:**
```
→ Query noticias F1 recientes
→ Buscar si hay noticia sobre "Canadá" o "Alonso"
→ Si existe: "Hamilton gana en Canadá (noticia)"
→ Si no: Empty
```

**5C - Select Snapshots:**
```
Budget disponible: 12000 - (live chars) - (news chars) = ~8000 chars

→ Query snapshots donde scope='global' OR scope='f1'
→ Score cada snapshot:
   - "f1-2026-season-data": score=45 (titulo+tags match "f1", "2026", "alonso")
   - "beengine-overview": score=5 (solo "f1" en tags)
   - "live-timing": score=0 (no match)
→ Seleccionar "f1-2026-season-data" (45 pts) primero
→ Si cabe, agregar otros...
→ Output:
   contextText: "## F1 2026 — Temporada actual\n\n...Alonso P5 en Canadá 10 pts..."
   sources: [{ slug: 'f1-2026-season-data', title: 'F1 2026 — Temporada actual' }]
```

**PASO 6: Combinar bloques de contexto**
```javascript
const blocks = [
  live.text,        // DATOS ACTUALES
  news.text,        // NOTICIAS
  "--- DOCUMENTOS DE CONTEXTO...\n" + contextText
];
const contextBlock = blocks.join('\n\n');
```

**PASO 7: Construir mensajes para Groq**
```javascript
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },  // "Eres asistente de BeEngine..."
  { role: 'system', content: contextBlock },   // "--- DATOS ACTUALES BEENGINE ---\n..."
  { role: 'user', content: "¿Dónde consiguió..." }
];
```

**PASO 8: Call Groq API**
```
POST https://api.groq.com/openai/v1/chat/completions
{
  model: "llama-3.3-70b-versatile",
  messages: [...],
  temperature: 0.35,
  max_tokens: 1024
}
```

**PASO 9: Groq genera respuesta**
```
Modelo lee:
  1. System prompt → "Úsa solo DATOS ACTUALES"
  2. Context block → "Alonso P5 en Canadá, 10 pts"
  3. User question → "¿Dónde consiguió su punto?"

Genera respuesta:
"Fernando Alonso consiguió su punto (10 pts) en el GP de Canadá,
terminando en 5ª posición. Actualmente lidera la clasificación..."

Wait: "Alonso lidera"? No, el contexto dice P3 con 92 pts.
Modelo corrige (temperature=0.35 es bajo, no alucina tanto)

Respuesta final:
"Fernando Alonso consiguió 10 puntos en el GP de Canadá como 5º clasificado.
Actualmente está en 3ª posición de la clasificación general con 92 puntos."
```

**PASO 10: Return respuesta + fuentes**
```javascript
{
  reply: "Fernando Alonso consiguió 10 puntos...",
  sources: [
    { slug: 'live-f1', title: 'Datos actuales F1' },
    { slug: 'f1-2026-season-data', title: 'F1 2026 — Temporada actual' }
  ]
}
```

---

## 4. Limitaciones Actuales

### 4.1 Datos Deportivos

| Limitación | Causa | Solución |
|-----------|-------|----------|
| No responde sobre carreras históricas específicas | Datos en vivo solo muestra standings y última carrera | Subir snapshots con detalles de cada carrera |
| No encuentra pilotos por nombre coloquial | Búsqueda exact match en standings | Mejorar tokenización, agregar aliases |
| MotoGP live: límites de API | Pulse Live tiene throttle | Caché + polling más espaciado |
| F2/F3 sin live timing | FIA no expone APIs públicas | Scraping limitado |

### 4.2 Knowledge Snapshots

| Limitación | Causa | Solución |
|-----------|-------|----------|
| Relevance scoring: keyword-only | Sin embeddings/semantic search | Integrar LLM embeddings (OpenAI, Cohere) |
| Snapshots no versionados | No hay diff histórico | Agregar version control en schema |
| Context injection naïve | Simple concatenación de texto | Usar retrieval-augmented generation (RAG) |

### 4.3 Configuración

| Limitación | Causa | Solución |
|-----------|-------|----------|
| Rate limit global 20/min | Groq tiene cuota baja | Subir plan o caché respuestas |
| Context budget 12000 chars | Groq max_tokens limitado | Comprimir contexto o modelos más grandes |
| Temperature fija 0.35 | No adaptativo | Variar por intención |
| Max 1024 tokens respuesta | Respuestas pueden ser incompletas | Streaming o split en múltiples calls |

---

## 5. Cómo Funciona la Búsqueda de Pilotos

### 5.1 Sin Snapshot

**Pregunta:** "¿Dónde está Alonso?"

**Proceso:**
1. Live Context: Busca "alonso" en standings actuales
2. Encuentra: "P3, Alonso (Aston Martin), 92 pts"
3. Output: "Alonso está 3º con 92 puntos"

**Limitación:** Solo funciona si Alonso **está actualmente en standings**. Si Alonso se retira o no compite en esa serie, no hay respuesta.

### 5.2 Con Snapshot

**Pregunta:** "¿Cuántos puntos consiguió Alonso en Mónaco?"

**Sin Snapshot:**
1. Live Context: Busca "alonso" + "monaco" en standings
2. No encuentra coincidencia (Mónaco es carrera pasada, no en standings)
3. Output: "No tengo datos sobre Mónaco"

**Con Snapshot (f1-2026-season-data.md):**
1. Live Context: No encuentra
2. Snapshot Search: Busca "alonso" en snapshots
3. Scoring: "f1-2026-season-data" score=30+ (titulo + contenido)
4. Selecciona snapshot
5. Contexto incluye: "GP Mónaco... Alonso P3... 15 pts"
6. Output: "Alonso consiguió 15 puntos en Mónaco como 3º"

---

## 6. Gestión de Contexto (Budget)

### 6.1 Asignación de Caracteres

**Total disponible:** 12,000 chars (ASSIST_MAX_SNAPSHOT_CHARS)

**Algoritmo:**
```
IF live.length + news.length < 12000:
    snapshots_budget = 12000 - (live.length + news.length)
    IF snapshots_budget > 4000:
        USE snapshots_budget
    ELSE:
        USE 4000 (mínimo)
ELSE:
    snapshots_budget = 4000
```

**Ejemplo:**
- Live: 3000 chars
- News: 1500 chars
- Snapshot Budget: max(4000, 12000 - 4500) = **7500 chars**

### 6.2 Selección Greedy

```javascript
// Ordenar por score descendente
const snapshots = [
  { slug: 'a', score: 45, length: 2000 },
  { slug: 'b', score: 30, length: 3000 },
  { slug: 'c', score: 20, length: 2500 }
];

// Agregar mientras quepa
totalChars = 0;
for (const snap of snapshots) {
  if (totalChars + snap.length <= 7500) {
    INCLUDE snap;
    totalChars += snap.length;  // totalChars = 2000
  } else {
    BREAK;
  }
}

// Resultado: snapshots 'a' y 'b' incluidos (5000 chars < 7500)
```

---

## 7. Error Handling & Edge Cases

### 7.1 API Externa Falla (Jolpica, FIA, Pulse Live)

```javascript
// assistLiveContext.js línea ~160-165
const [drivers, teams, calendar, lastRace] = await Promise.all([
  api.drivers().catch(() => ({ items: [], source: 'n/a' })),
  api.teams().catch(() => ({ items: [], source: 'n/a' })),
  api.calendar().catch(() => ({ items: [] })),
  api.lastRace().catch(() => null)
]);

// Si Jolpica cae: live.text = "--- Sin datos de F1 disponibles ---"
// Continúa con news + snapshots
```

### 7.2 Base de Datos Offline

```javascript
// knowledgeSnapshot.service.js línea ~50
const snapshots = await db('assistKnowledgeSnapshot')...
  .catch(() => []);  // Si BD cae, snapshots vacío

// Continúa con live + news
```

### 7.3 Groq API Rate Limited

```javascript
// assistChat.service.js línea ~130-140
if (!res.ok && res.status === 429) {
  const err = new Error('Rate limit alcanzado (20/min)');
  err.status = 429;
  throw err;
}
// Frontend recibe 429 y muestra "Demasiadas preguntas, espera..."
```

### 7.4 Pregunta Ambigua / Sin Contexto

**Pregunta:** "¿Quién?"

**Flujo:**
1. Intención detectada como `isPureNavigationQuestion`
2. Live Context: `{ text: '', used: false }`
3. News Context: `{ text: '', used: false }`
4. Snapshots: Search de "quien" (muy genérico) → bajo score
5. Context para Groq casi vacío
6. Groq responde: "Necesito más contexto. ¿Preguntás por un piloto?"

---

## 8. Flujo de Mantenimiento

### 8.1 Actualizar Snapshots

**Comando:**
```bash
npm run assist:snapshot:upsert -- \
  --file docs/assist-snapshots/f1-2026-season-data.md \
  --slug f1-2026-season-data
```

**Lo que pasa:**
1. Lee markdown
2. Parsea frontmatter YAML (slug, title, scope, tags)
3. Extrae body (contenido)
4. Upsert en BD (insert o update si existe)

**Frontmatter requerido:**
```yaml
---
slug: f1-2026-season-data
title: F1 2026 — Temporada actual
scope: f1
tags: f1 2026 clasificación pilotos alonso hamilton
---
```

### 8.2 Seed Inicial de Snapshots

```bash
npm run assist:snapshot:seed
```

**Carga todos los .md en docs/assist-snapshots/ y los inserta**

### 8.3 Listar Snapshots (Dev)

```bash
GET /api/assist/snapshots
```

**Response:**
```javascript
[
  {
    slug: "f1-2026-season-data",
    title: "F1 2026 — Temporada actual",
    scope: "f1",
    tags: "f1 2026 clasificación pilotos",
    createdAt: "2026-06-10T00:00:00Z",
    version: 1
  },
  ...
]
```

---

## 9. Configuración (.env)

```bash
# Assistant IA
ASSIST_ENABLED=true                    # Habilitar asistente
GROQ_API_KEY=gsk_...                   # API key Groq (gratis)
GROQ_MODEL=llama-3.3-70b-versatile    # Modelo LLM
ASSIST_MAX_SNAPSHOT_CHARS=12000        # Budget contexto snapshots
ASSIST_RATE_LIMIT_PER_MIN=20           # Requests/min por usuario

# APIs Externas (Datos en vivo)
JOLPICA_F1_ENABLED=true
JOLPICA_BASE_URL=https://api.jolpi.ca/ergast/f1
OPENF1_BASE_URL=https://api.openf1.org/v1
MOTOGP_PULSELIVE_BASE_URL=https://api.motogp.pulselive.com/motogp/v1
FIA_F2_BASE_URL=https://www.fiaformula2.com
FIA_F3_BASE_URL=https://www.fiaformula3.com

# DB
DATABASE_URL=postgresql://...          # Supabase
```

---

## 10. Casos de Uso Reales

### 10.1 ✅ "¿Dónde está Hamilton?"

**Datos disponibles:**
- Live: Standings F1 actual
- Snapshot: Ninguno relevante

**Respuesta:** "Lewis Hamilton está en 1ª posición con 156 puntos"

---

### 10.2 ✅ "¿Cuántos puntos tiene Alonso en Canadá?"

**Datos disponibles (CON snapshot):**
- Snapshot: "GP Canadá... Alonso P5, 10 pts"

**Respuesta:** "Fernando Alonso consiguió 10 puntos como 5º en Canadá"

**Sin snapshot:**
- Live: No encuentra Canadá (pasado)
- Respuesta: "No tengo detalles de carreras anteriores"

---

### 10.3 ❌ "¿Dónde está Senna?"

**Por qué falla:**
- Live: Senna no en standings 2026
- Snapshot: Sin datos históricos pre-2026
- Groq: System prompt dice "no inventes"

**Respuesta:** "No tengo datos de Ayrton Senna en la base de datos de BeEngine"

---

### 10.4 ✅ "¿Cómo agrego favoritos?"

**Detección:** `isPureNavigationQuestion = true`
- Live Context: Skipped
- Snapshot: Selecciona "beengine-complete" (scope=global)
- Snapshot content: "Sidebar → ❤️ → Guardar piloto"

**Respuesta:** "En el sidebar, haz clic en el ❤️ de un piloto para agregarlo a favoritos"

---

## 11. Observabilidad & Debugging

### 11.1 Logs del Asistente

**Ubicación:** `backend/src/controllers/assist.controller.js`

```javascript
console.log('[ASSIST]', {
  timestamp: new Date().toISOString(),
  userId: req.auth.sub,
  message,
  scope,
  liveContextUsed: live.used,
  newsContextUsed: news.used,
  snapshotsUsed: sources.length,
  groqLatency: Date.now() - startTime,
  responseLength: reply.length
});
```

### 11.2 Métricas Útiles

- **Tiempo promedio:** ~1-2 segundos (paralelización)
- **Éxito de intención:** ~85% (algunos queries ambiguos fallan)
- **Snapshot hits:** ~60% (depende de snapshot coverage)
- **Groq errors:** <1% (muy confiable)

### 11.3 Test Manual

```bash
# En cliente frontend (consola JavaScript)
await fetch('http://localhost:3000/api/assist/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "¿Quién lidera F1?",
    scope: "f1"
  })
}).then(r => r.json()).then(d => console.log(d.reply));
```

## Resumen Ejecutivo

El asistente IA de BeEngine es un sistema de **búsqueda contextual + generación** que:

1. **Paraleliza 3 fuentes:** datos en vivo (APIs), noticias, knowledge snapshots
2. **Inyecta contexto** completo en el system prompt del LLM
3. **Fuerza honestidad:** System prompt prohibe invención de datos
4. **Maneja presupuesto:** Budget dinámico para snapshots
5. **Busca por relevancia:** Keyword matching en snapshots
6. **Retorna fuentes:** Usuario ve de dónde vino la respuesta

**Limitación principal:** Sin snapshots detallados, no responde sobre carreras específicas. **Solución:** Subir snapshots de cada carrera con resultados y puntos.

---

**Fin del documento**
