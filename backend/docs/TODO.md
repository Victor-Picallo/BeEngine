# BeEngine — TODO

**Un comando tras cada GP** (F1 + F2 + F3 + MotoGP + Moto2 + Moto3):

```bash
cd backend
npm run refresh
```

Fin de semana (solo standings/resultados recientes):

```bash
npm run refresh:weekend
```

Sin subir imágenes a Storage:

```bash
npm run refresh -- --no-storage
```

Atajos parciales: `npm run refresh:formula` · `npm run refresh:moto`

Comprobar medios al 100 %:

```bash
npm run verify:media -- --strict
```

---

## Medios en DB — cerrado (6 series)

| Bloque | Comando verify |
|--------|----------------|
| F1 / F2 / F3 | `npm run verify:media -- --formula --strict` |
| MotoGP / Moto2 / Moto3 | `npm run verify:media -- --moto --strict` |
| **Todo** | `npm run verify:media -- --strict` |

---

## Manual

- [ ] Health: `http://localhost:3000/api/health`
- [ ] QA badge “Datos en caché”
- [ ] Prisma Studio
- [ ] GitHub secrets CI (`DATABASE_URL`, `DIRECT_URL`)

## Otros

| Área | Notas |
|------|--------|
| Noticias | F1 + MotoGP en DB |
| Perfiles | `sync-profile-meta` (incluido en `refresh`) |
| Cron | Manual post-GP; sin scheduler en repo |

## Comandos sueltos

| Comando | Cuándo |
|---------|--------|
| `npm run db:sync:f1` | Solo sync F1 |
| `npm run storage:upload` | Solo Storage (sin sync previo) |
| `npm run db:enrich:formula-circuits` | Solo circuitos fórmula |
