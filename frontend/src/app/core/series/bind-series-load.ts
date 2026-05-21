import { DestroyRef, inject, Injector } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SeriesContextService } from './series-context.service';
import type { SeriesId } from './series.types';

/** Evita aplicar respuestas de una serie si el usuario ya cambió de F1↔F2. */
export function isSeriesStillActive(
  expected: SeriesId,
  current: () => SeriesId,
): boolean {
  return current() === expected;
}

/**
 * Ejecuta `load` cada vez que cambia la serie (F1↔F2).
 * Debe llamarse desde constructor o campo de clase (contexto de inyección).
 */
export function bindSeriesLoad(
  load: (seriesId: SeriesId) => Observable<unknown>,
  destroyRef?: DestroyRef,
): void {
  const ref = destroyRef ?? inject(DestroyRef);
  const injector = inject(Injector);
  const seriesCtx = inject(SeriesContextService);

  toObservable(seriesCtx.id, { injector })
    .pipe(
      distinctUntilChanged(),
      switchMap((id) => load(id)),
      takeUntilDestroyed(ref),
    )
    .subscribe();
}
