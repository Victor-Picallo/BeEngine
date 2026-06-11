# Proceso de Obtención y Sincronización de Datos (BeEngine)

Este documento detalla el flujo interno y los pasos necesarios para obtener los datos del mundo del motor (Fórmula 1, F2, F3, MotoGP, Moto2, Moto3) desde diferentes fuentes externas y guardarlos en la base de datos de BeEngine.

## 1. Arquitectura y Flujo de Datos

El flujo general de sincronización sigue este patrón:

1. **Extracción (Fetch):** Scripts ubicados en `backend/src/external/` se conectan a diversas APIs públicas o servicios (Jolpica, OpenF1, API oficial de MotoGP, FIA, Feeds RSS) para descargar datos actualizados sobre temporadas, pilotos, equipos, circuitos y resultados.
2. **Transformación (Normalize):** La información recibida, que viene en distintos formatos dependiendo de la fuente, se normaliza a los modelos internos de BeEngine para mantener una estructura de base de datos coherente.
3. **Carga (Upsert con Prisma):** A través de rutinas definidas en `backend/scripts/sync/`, se utilizan operaciones `upsert` en la base de datos local vía **Prisma ORM**. Esto asegura que si el registro no existe, se crea; y si ya existe, se actualiza, evitando duplicados.

## 2. Fuentes de Datos Principales

El proyecto BeEngine extrae información desde las siguientes plataformas:

- **Fórmula 1:** Combinación de *Jolpica* (datos históricos/resultados), *OpenF1* y la *FIA API* para extraer sesiones en tiempo real (Live Timing).
- **Feeder Series (F2 / F3):** Principalmente usando los endpoints o archivos de la *FIA* y *Jolpica*.
- **Mundial de Motociclismo (MotoGP, Moto2, Moto3):** Extraído directamente a través de adaptadores (`backend/src/external/motogp/`) que procesan la API de *MotoGP*.
- **Noticias:** A través de *RSS Parsers* (`utils/rssParser.js`) conectándose a fuentes oficiales y especializadas.

## 3. Preparación y Requisitos Previos

Antes de poder sincronizar datos por primera vez en la base de datos de BeEngine, debes asegurarte de lo siguiente:

1. **Instalar Dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Variables de Entorno (`.env`):**
   Asegúrate de copiar el archivo de ejemplo y configurar la URL de tu base de datos (PostgreSQL/Supabase).
   ```bash
   cp .env.example .env
   ```
   Asegúrate de que `DATABASE_URL` apunte a tu base de datos PostgreSQL.

3. **Preparar Prisma:**
   Sincroniza el esquema de Prisma con la base de datos:
   ```bash
   npm run db:generate    # Genera el cliente de Prisma
   npm run db:migrate     # Aplica las migraciones (estructura) a la DB
   ```

## 4. Ejecución de los Scripts de Sincronización

BeEngine facilita la sincronización total o por categoría a través de scripts definidos en el `package.json`. Todos ellos se ejecutan usando la línea de comandos desde el directorio `/backend`.

### Sincronización Global
Obtiene la información de todas las categorías, circuitos y noticias de un solo golpe.
```bash
npm run db:sync
```
*(Llama internamente a `node scripts/sync/sync-all.mjs`)*

### Sincronización por Categorías
Si sólo necesitas actualizar una categoría en particular, usa:
- **Fórmula 1:** `npm run db:sync:f1`
- **Fórmula 2:** `npm run db:sync:f2`
- **Fórmula 3:** `npm run db:sync:f3`
- **MotoGP:** `npm run db:sync:motogp`
- **Moto2:** `npm run db:sync:moto2`
- **Moto3:** `npm run db:sync:moto3`

### Sincronización de Noticias
Descarga y almacena los últimos artículos y novedades mediante fuentes RSS:
```bash
npm run db:sync:news
```

### Sincronización de Fin de Semana (Weekend Sync)
Ideal para ser usado frecuentemente durante un Gran Premio (Ej. procesos en Cron), para sincronizar exclusivamente las sesiones de carreras o clasificaciones recientes sin sobrecargar las peticiones históricas.
```bash
npm run db:sync:weekend
```

### Refresh (Orquestador Principal)
Existe un comando superior llamado `refresh` que además de llamar a los scripts de sincronización de base de datos (`db:sync`), se encarga de realizar validaciones y tareas secundarias de manera orquestada.
```bash
npm run refresh
```
*(También existen alternativas divididas: `npm run refresh:formula` o `npm run refresh:moto`)*

## 5. Scripts Adicionales

El ecosistema contiene scripts adicionales útiles para enriquecer los datos de BeEngine:
- `npm run circuit:pulse-map` / `npm run circuit:moto-svg` / `npm run db:enrich:formula-circuits`: Extraen y enriquecen la información geo-espacial y trazos SVG de los circuitos para ser dibujados en el frontend.
- `npm run db:seed`: Inyecta datos básicos estáticos que están fuera del rango de las APIs.
- `npm run storage:upload`: Sube las imágenes de pilotos/equipos escrapeadas a los Storage Buckets de Supabase.
