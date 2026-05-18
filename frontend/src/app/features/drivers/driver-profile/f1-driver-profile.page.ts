import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import { F1LiveService } from '../../f1-live/f1-live.service';
import type {
  JolpikaDriverProfile,
  JolpikaDriverProfileRaceRow,
  JolpikaDriverStanding,
  OpenF1Driver,
} from '../../f1-live/f1-live.types';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { AppSidebarComponent } from '../../../shared/components/app-sidebar/app-sidebar.component';
import {
  ACCENT,
  countryCodesForDriver,
  flagCdnUrl as driverFlagCdnUrl,
  normalize,
  resolveDriverHeadshotUrl,
  teamColor,
} from '../drivers-shared';

const NAT_ES: Record<string, string> = {
  British: 'Británico',
  Dutch: 'Neerlandés',
  Spanish: 'Español',
  Monegasque: 'Monegasco',
  Australian: 'Australiano',
  French: 'Francés',
  Italian: 'Italiano',
  Mexican: 'Mexicano',
  Japanese: 'Japonés',
  Thai: 'Tailandés',
  Canadian: 'Canadiense',
  German: 'Alemán',
  Finnish: 'Finlandés',
  Danish: 'Danés',
  Chinese: 'Chino',
  American: 'Estadounidense',
  'New Zealander': 'Neozelandés',
  Argentine: 'Argentino',
  Brazilian: 'Brasileño',
};

function matchOpenF1Driver(profile: JolpikaDriverProfile, open: OpenF1Driver[]): OpenF1Driver | undefined {
  if (!open.length) return undefined;
  const jn = normalize(`${profile.givenName} ${profile.familyName}`);
  const jLast = jn.split(/\s+/).pop() ?? '';
  const exact = open.find(o => normalize(o.fullName) === jn);
  if (exact) return exact;
  return open.find(o => {
    const fn = normalize(o.fullName);
    const parts = fn.split(/\s+/);
    const oLast = parts[parts.length - 1] ?? '';
    return oLast === jLast;
  });
}

function formatBirthEs(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  return `${d} ${months[m - 1] ?? ''} ${y}`;
}

@Component({
  selector: 'app-f1-driver-profile-page',
  standalone: true,
  imports: [
    AppHeaderComponent,
    AppSidebarComponent,
    RouterLink,
    DecimalPipe,
    UpperCasePipe,
  ],
  templateUrl: './f1-driver-profile.page.html',
  styleUrls: ['../../calendar/f1-calendar.page.css', './f1-driver-profile.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class F1DriverProfilePageComponent {
  private readonly f1 = inject(F1LiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly accent = ACCENT;
  readonly flagImgUrl = driverFlagCdnUrl;
  readonly fmtBirth = formatBirthEs;

  loading = signal(true);
  error = signal<string | null>(null);
  profile = signal<JolpikaDriverProfile | null>(null);
  openf1 = signal<OpenF1Driver | undefined>(undefined);
  standing = signal<JolpikaDriverStanding | undefined>(undefined);

  teamHue = computed(() => {
    const o = this.openf1();
    const st = this.standing();
    const raw = o?.teamColour?.trim();
    if (raw) {
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex;
    }
    return teamColor(o?.teamName ?? st?.team ?? '');
  });

  headshotUrl = computed(() => {
    const p = this.profile();
    const full = p ? `${p.givenName} ${p.familyName}`.trim() : '';
    return resolveDriverHeadshotUrl(p?.driverId ?? '', full, this.openf1()?.headshotUrl);
  });

  displayNumber = computed(() => {
    const n = this.openf1()?.driverNumber;
    if (Number.isFinite(n)) return String(n);
    const p = this.profile()?.number;
    return p != null ? String(p) : '—';
  });

  nationalityLabel = computed(() => {
    const n = this.profile()?.nationality ?? '';
    return NAT_ES[n] ?? n;
  });

  countryCode2 = computed(() => {
    const p = this.profile();
    const o = this.openf1();
    if (!p) return '';
    const fake: JolpikaDriverStanding = {
      pos: 0,
      driver: `${p.givenName} ${p.familyName}`,
      driverId: p.driverId,
      team: o?.teamName ?? this.standing()?.team ?? '',
      points: 0,
      wins: 0,
      nationality: p.nationality,
    };
    return countryCodesForDriver(fake, o).alpha2;
  });

  bioText = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const name = `${p.givenName} ${p.familyName}`;
    const nat = NAT_ES[p.nationality] ?? p.nationality;
    const born = formatBirthEs(p.dateOfBirth);
    const num = this.displayNumber();
    const s = p.stats;
    return (
      `${name} (${nat}, nacido el ${born}) compite en Fórmula 1${num !== '—' ? ` con el dorsal ${num}` : ''}. ` +
      `Debutó en ${p.debut}. ` +
      `Ha disputado ${s.races} grandes premios, con ${s.wins} victorias, ${s.podiums} podios y ${s.poles} poles. ` +
      `En lo que va de la temporada ${p.currentSeasonYear} lleva ${s.winsCurrentSeason} victorias. ` +
      `Suma más de ${Math.floor(s.points)} puntos en su trayectoria en la categoría reina del automovilismo.`
    );
  });

  maxCareerPts = computed(() => {
    const p = this.profile();
    const meta = p?.careerHistoryPagination;
    if (meta != null && meta.maxPts > 0) return meta.maxPts;
    const rows = p?.careerHistory ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map(r => r.pts), 1);
  });

  careerSeasonCount(p: JolpikaDriverProfile): number {
    return p.careerHistoryPagination?.totalYears ?? p.careerHistory.length;
  }

  stepCareerPage(delta: number): void {
    const pag = this.profile()?.careerHistoryPagination;
    if (!pag) return;
    const next = Math.min(Math.max(1, pag.page + delta), pag.totalPages);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { careerPage: next > 1 ? next : null },
      queryParamsHandling: 'merge',
    });
  }

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, q]) => ({
          id: params.get('driverId')?.trim() ?? '',
          careerPage: Math.max(1, parseInt(q.get('careerPage') || '1', 10) || 1),
        })),
        distinctUntilChanged((a, b) => a.id === b.id && a.careerPage === b.careerPage),
        switchMap(({ id, careerPage }) => {
          if (!id) {
            this.loading.set(false);
            this.error.set('Piloto no indicado.');
            return of(null);
          }
          this.loading.set(true);
          this.error.set(null);
          return forkJoin({
            profile: this.f1.getDriverProfile(id, careerPage).pipe(catchError(() => of(null))),
            openf1: this.f1.getDrivers('latest').pipe(catchError(() => of<OpenF1Driver[]>([]))),
            standings: this.f1.getDriverStandings().pipe(catchError(() => of<JolpikaDriverStanding[]>([]))),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        if (res === null) return;
        if (!res.profile) {
          this.profile.set(null);
          this.loading.set(false);
          this.error.set('No se encontró la ficha de este piloto.');
          return;
        }
        const p = res.profile;
        const o = matchOpenF1Driver(p, res.openf1);
        const st = res.standings.find(s => s.driverId === p.driverId);
        this.profile.set(p);
        this.openf1.set(o);
        this.standing.set(st);
        this.loading.set(false);
        this.error.set(null);
      });
  }

  imgError(ev: Event): void {
    const el = ev.target;
    if (el instanceof HTMLImageElement) el.style.display = 'none';
  }

  rowTeamColor(teamName: string): string {
    return teamColor(teamName);
  }

  seasonSummary(races: JolpikaDriverProfileRaceRow[]): { wins: number; podiums: number; pts: number } {
    const wins = races.filter(r => r.pos === 1).length;
    const podiums = races.filter(r => r.pos > 0 && r.pos <= 3).length;
    const pts = races.reduce((a, r) => a + r.pts, 0);
    return { wins, podiums, pts };
  }
}
