import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, skip } from 'rxjs';
import { SeriesContextService } from './series-context.service';

/** Vuelve a llamar `load` al cambiar F1↔F2↔F3 (misma página, otra serie). */
export function reloadWhenSeriesChanges(load: () => void, destroyRef?: DestroyRef): void {
  const ref = destroyRef ?? inject(DestroyRef);
  const ctx = inject(SeriesContextService);
  toObservable(ctx.id)
    .pipe(distinctUntilChanged(), skip(1), takeUntilDestroyed(ref))
    .subscribe(() => load());
}
