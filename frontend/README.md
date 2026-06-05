# BeEngine Frontend

App Angular de BeEngine.

## Arrancar

```bash
npm install
ng serve
```

Abre `http://localhost:4200`. Necesitas el API en `http://localhost:3000`.

## Build

```bash
ng build              # producción → dist/
ng build --configuration development
```

## Entornos

| Archivo | Cuándo |
|---------|--------|
| `src/environments/environment.ts` | Build producción |
| `src/environments/environment.development.ts` | `ng serve` |

En producción, `apiUrl` apunta al API desplegado (Render).

## Estructura (resumen)

```
src/app/
├── features/     Páginas (home, calendario, live, auth…)
├── shared/       Topbar, sidebar, tablas…
└── core/         Auth, API, series
```

Documentación general del proyecto: [README](../README.md) en la raíz.
