import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import type { DataSource } from '../data-source';
import { mergeDataSources } from '../data-source';
import type { SourcedData } from '../services/api.service';

export function hybridSourceOf(value: unknown): DataSource | undefined {
  const s = String((value as SourcedData<unknown>)?.source ?? '');
  if (s === 'db' || s === 'live' || s === 'empty') return s;
  return undefined;
}

export interface HybridStream<T> {
  load: () => Observable<T>;
  onValue: (value: T) => void;
  onError?: () => void;
}

export interface HybridLoadOptions {
  isActive: () => boolean;
  /** Primera emisión útil (DB o live). */
  onReady: () => void;
  /** Todas las peticiones terminaron (éxito o error). */
  onAllSettled?: () => void;
  /** Tras cada emisión, si algún stream aporta `source`. */
  onSources?: (sources: (DataSource | undefined)[]) => void;
}

/** Suscripciones paralelas con pintado en cada emisión de getDbThenLive. */
export function startHybridLoad(
  streams: HybridStream<unknown>[],
  options: HybridLoadOptions,
): Subscription {
  let ready = false;
  let pending = streams.length;
  const sources: (DataSource | undefined)[] = new Array(streams.length);

  const sub = new Subscription();

  const emitSources = () => {
    options.onSources?.(sources);
  };

  const tryReady = () => {
    if (!ready && options.isActive()) {
      ready = true;
      options.onReady();
    }
    emitSources();
  };

  streams.forEach((stream, i) => {
    sub.add(
      stream
        .load()
        .pipe(
          tap((value) => {
            if (!options.isActive()) return;
            sources[i] = hybridSourceOf(value);
            stream.onValue(value);
            tryReady();
          }),
          catchError(() => {
            stream.onError?.();
            return of(undefined);
          }),
          finalize(() => {
            pending -= 1;
            if (pending === 0) options.onAllSettled?.();
          }),
        )
        .subscribe(),
    );
  });

  return sub;
}

export function mergeHybridSources(sources: (DataSource | undefined)[]): DataSource | null {
  return mergeDataSources(...sources);
}

/** shareReplay para getDbThenLive: conserva DB + live para suscriptores tardíos. */
export const HYBRID_SHARE_REPLAY = { bufferSize: 2, refCount: true } as const;
