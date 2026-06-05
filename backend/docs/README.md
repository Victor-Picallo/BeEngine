# Documentación BeEngine

## Carpeta `assist-snapshots/`

Textos que usa el **asistente de ayuda** (chat con IA). Cada `.md` tiene cabecera YAML (`slug`, `title`, `tags`).

### Actualizar en la base de datos

Desde `backend/`:

```bash
npm run assist:snapshot:seed      # sube todos los .md
npm run assist:snapshot:merge     # regenera beengine-completo.md
```

Para un solo archivo:

```bash
npm run assist:snapshot:upsert -- --file docs/assist-snapshots/foo.md --slug foo
```

### Archivos

| Archivo | Contenido |
|---------|-----------|
| `beengine-overview.md` | Qué es BeEngine, categorías, UI |
| `interfaz-navegacion.md` | Topbar, sidebar, favoritos |
| `pantalla-inicio.md` | Home por categoría |
| `calendario-clasificacion.md` | Calendario y standings |
| `navegacion-f1.md` … `navegacion-moto3.md` | Rutas por serie |
| `live-timing.md` | F1 y MotoGP en directo |
| `noticias.md` | Feed de noticias |
| `perfiles-fichas.md` | Pilotos y equipos |
| `cuenta-usuario.md` | Login, Google, favoritos |
| `asistente-ia.md` | Cómo funciona el chat |
| `datos-actualizacion.md` | Fuentes de datos y sync |
| `beengine-completo.md` | **Generado** — no editar a mano |
