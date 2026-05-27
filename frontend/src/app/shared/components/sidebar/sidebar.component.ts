import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ReturnNavDirective } from '../../../core/directives/return-nav.directive';
import { Category } from '../../../data/sports.data';
import { AuthService } from '../../../core/auth/auth.service';
import type { SidebarFavoriteRow } from '../../../core/auth/auth-favorites.utils';
import { homePathForSeries } from '../../../core/series/series.config';
import { seriesSectionPath } from '../../../core/series/series-sidebar';
import type { SeriesId } from '../../../core/series/series.types';
import { F1LiveService } from '../../../features/f1-live/f1-live.service';
import type { OpenF1Driver } from '../../../features/f1-live/f1-live.types';
import {
  driverDisplayInitials,
  isFeederPortraitSeries,
  matchOpenF1Driver,
  resolveDriverHeadshotRawUrl,
  resolveDriverHeadshotUrl,
} from '../../../features/drivers/drivers-shared';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css', '../../../features/drivers/driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, RouterLink, ReturnNavDirective],
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly f1Live = inject(F1LiveService);
  readonly auth = inject(AuthService);

  categories = input.required<Category[]>();
  activeCat = input.required<string>();
  accent = input.required<string>();
  sections = input.required<string[]>();
  sectionSeriesId = input<SeriesId | null>(null);

  private readonly driverThumbByKey = signal<Record<string, string>>({});
  private readonly failedThumbKeys = signal<Set<string>>(new Set());

  readonly favoriteRows = computed(() => {
    const rows = this.auth.sidebarFavoriteRows();
    const thumbs = this.driverThumbByKey();
    return rows.map((row) => ({
      ...row,
      thumbUrl: row.kind === 'category' ? row.thumbUrl : thumbs[row.key] || row.thumbUrl,
    }));
  });

  readonly driverInitials = driverDisplayInitials;
  readonly isFeederPortrait = isFeederPortraitSeries;

  constructor() {
    effect(() => {
      const rows = this.auth.sidebarFavoriteRows();
      const loggedIn = this.auth.isLoggedIn();
      if (!loggedIn || !rows.some((r) => r.kind === 'driver' && r.driverId)) {
        untracked(() => {
          this.driverThumbByKey.set({});
          this.failedThumbKeys.set(new Set());
        });
        return;
      }
      untracked(() => this.loadDriverThumbnails(rows));
    });
  }

  private activeSeriesId(): SeriesId {
    return this.sectionSeriesId() ?? (this.activeCat() as SeriesId);
  }

  sectionPath(label: string): string | null {
    return seriesSectionPath(this.activeSeriesId(), label);
  }

  favoriteLink(row: SidebarFavoriteRow): string | (string | number)[] {
    if (row.kind === 'category') {
      return homePathForSeries(row.seriesId);
    }
    if (!row.driverId) {
      return homePathForSeries(row.seriesId);
    }
    if (row.seriesId === 'f1') {
      return ['/f1', 'pilotos', row.driverId];
    }
    return [`/${row.seriesId}`, 'pilotos', row.driverId];
  }

  thumbVisible(row: SidebarFavoriteRow & { thumbUrl: string }): boolean {
    return Boolean(row.thumbUrl?.trim()) && !this.failedThumbKeys().has(row.key);
  }

  thumbError(row: SidebarFavoriteRow & { thumbUrl: string }, ev: Event): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    if (row.kind === 'driver' && row.driverId && !el.dataset['rawRetry']) {
      const raw = resolveDriverHeadshotRawUrl(row.driverId, row.seriesId, row.thumbUrl);
      if (raw && raw !== el.src) {
        el.dataset['rawRetry'] = '1';
        el.src = raw;
        return;
      }
    }
    this.failedThumbKeys.update((set) => new Set(set).add(row.key));
  }

  private loadDriverThumbnails(rows: SidebarFavoriteRow[]): void {
    const drivers = rows.filter((r) => r.kind === 'driver' && r.driverId);
    const seriesIds = [...new Set(drivers.map((d) => d.seriesId))];

    forkJoin(
      seriesIds.map((sid) =>
        forkJoin({
          sid: of(sid),
          standings: this.f1Live
            .getDriverStandings(false, sid)
            .pipe(catchError(() => of([]))),
          open:
            sid === 'f1'
              ? this.f1Live.getDrivers('latest', 'f1').pipe(catchError(() => of([] as OpenF1Driver[])))
              : of([] as OpenF1Driver[]),
        }),
      ),
    ).subscribe((results) => {
      const next: Record<string, string> = {};
      for (const { sid, standings, open } of results) {
        for (const row of drivers.filter((d) => d.seriesId === sid)) {
          const standing = standings.find((s) => s.driverId === row.driverId);
          const matched = standing ? matchOpenF1Driver(standing, open) : undefined;
          const url = resolveDriverHeadshotUrl(
            row.driverId!,
            row.title,
            standing?.headshotUrl ?? matched?.headshotUrl,
            { seriesId: sid, size: 'card' },
          );
          if (url) next[row.key] = url;
        }
      }
      this.driverThumbByKey.set(next);
      this.failedThumbKeys.set(new Set());
    });
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigateByUrl('/');
  }

  catChange = output<string>();
}
