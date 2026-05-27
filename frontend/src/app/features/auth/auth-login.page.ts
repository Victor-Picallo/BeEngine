import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { catchError, forkJoin, of } from 'rxjs';
import type { SeriesId } from '../../core/series/series.types';
import { AuthService } from '../../core/auth/auth.service';
import type { UserFavoriteDto } from '../../core/auth/auth.types';
import { F1LiveService } from '../f1-live/f1-live.service';
import type { JolpikaDriverStanding, OpenF1Driver } from '../f1-live/f1-live.types';
import {
  AuthDriverPickerOption,
  buildAuthDriverPickerOptions,
  driverDisplayInitials,
  resolveDriverHeadshotRawUrl,
  isFeederPortraitSeries,
} from '../drivers/drivers-shared';

export type AuthMode = 'login' | 'register' | 'reset' | 'new-password';

interface FavCategoryOption {
  id: string;
  label: string;
  color: string;
  fg?: string;
}

@Component({
  selector: 'app-auth-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-login.page.html',
  styleUrls: ['./auth-login.page.css', '../drivers/driver-portrait.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLoginPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly f1Live = inject(F1LiveService);
  readonly auth = inject(AuthService);

  readonly mode = signal<AuthMode>('login');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly doneHint = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly authReady = this.auth.ready;
  readonly authConfigured = this.auth.configured;
  readonly favCategory = signal<string | null>(null);
  readonly driversLoading = signal(false);
  private readonly driverStandings = signal<JolpikaDriverStanding[]>([]);
  private readonly openF1Drivers = signal<OpenF1Driver[]>([]);

  readonly driverOptions = computed(() =>
    buildAuthDriverPickerOptions(
      this.driverStandings(),
      this.openF1Drivers(),
      (this.favCategory() ?? 'f1') as SeriesId,
    ),
  );

  readonly driverInitials = driverDisplayInitials;
  readonly isFeederPortrait = isFeederPortraitSeries;

  email = '';
  password = '';
  passwordConfirm = '';
  name = '';
  favDriverId = '';

  readonly strengthBars = [1, 2, 3, 4];

  readonly favCategories: FavCategoryOption[] = [
    { id: 'f1', label: 'F1', color: '#FFD100', fg: '#000' },
    { id: 'f2', label: 'F2', color: '#0090FF', fg: '#fff' },
    { id: 'f3', label: 'F3', color: '#9E9E9E', fg: '#fff' },
    { id: 'motogp', label: 'MotoGP', color: '#0052CC', fg: '#fff' },
    { id: 'moto2', label: 'Moto2', color: '#FF6B35', fg: '#fff' },
    { id: 'moto3', label: 'Moto3', color: '#52C41A', fg: '#fff' },
  ];

  constructor() {
    effect(() => {
      if (this.auth.isPasswordRecovery()) {
        this.mode.set('new-password');
      }
    });
  }

  readonly features: { text: string; icon: SafeHtml }[] = [
    {
      text: 'Timing en directo de todas las categorías',
      icon: this.icon(
        '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M9 5V9L12 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      ),
    },
    {
      text: 'Noticias, análisis y paddock al momento',
      icon: this.icon(
        '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5H15M3 9H15M3 13H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      ),
    },
    {
      text: 'Fichas completas de pilotos y escuderías',
      icon: this.icon(
        '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="7" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 12L16 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      ),
    },
    {
      text: 'Calendario oficial y resultados de cada carrera',
      icon: this.icon(
        '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 2V5M12 2V5M2 8H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      ),
    },
  ];

  ngOnInit(): void {
    void this.bootstrapAuthMode();
  }

  private async bootstrapAuthMode(): Promise<void> {
    await this.auth.init(!this.auth.configured());
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'new-password' || this.auth.isPasswordRecovery()) {
      this.mode.set('new-password');
      if (!this.auth.session()) {
        this.errorMessage.set(
          'El enlace ha expirado o no es válido. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».',
        );
      }
      return;
    }
    if (tab === 'register' || tab === 'registro') {
      this.mode.set('register');
    }
  }

  setMode(next: AuthMode): void {
    this.mode.set(next);
    this.done.set(false);
    this.doneHint.set(null);
    this.errorMessage.set(null);
    if (next !== 'register') {
      this.favCategory.set(null);
      this.driverStandings.set([]);
      this.openF1Drivers.set([]);
      this.favDriverId = '';
    }
  }

  selectFavCategory(seriesId: string): void {
    this.favCategory.set(seriesId);
    this.favDriverId = '';
    this.driversLoading.set(true);
    this.driverStandings.set([]);
    this.openF1Drivers.set([]);

    const sid = seriesId as SeriesId;
    forkJoin({
      standings: this.f1Live
        .getDriverStandings(false, sid)
        .pipe(catchError(() => of([] as JolpikaDriverStanding[]))),
      open: this.f1Live
        .getDrivers('latest', sid)
        .pipe(catchError(() => of([] as OpenF1Driver[]))),
    }).subscribe(({ standings, open }) => {
      if (this.favCategory() !== seriesId) return;
      this.driverStandings.set(standings);
      this.openF1Drivers.set(open);
      this.driversLoading.set(false);
    });
  }

  selectFavDriver(driverId: string): void {
    this.favDriverId = driverId;
  }

  selectedDriverOption(): AuthDriverPickerOption | undefined {
    return this.driverOptions().find((d) => d.driverId === this.favDriverId);
  }

  driverImgError(ev: Event, opt: AuthDriverPickerOption): void {
    const el = ev.target;
    if (!(el instanceof HTMLImageElement)) return;
    const sid = (this.favCategory() ?? 'f1') as SeriesId;
    if (!el.dataset['rawRetry']) {
      const raw = resolveDriverHeadshotRawUrl(opt.driverId, sid);
      if (raw && raw !== el.src) {
        el.dataset['rawRetry'] = '1';
        el.src = raw;
        return;
      }
    }
    el.style.display = 'none';
    el.closest('.auth-driver-photo')?.classList.add('auth-driver-photo--fallback');
  }

  selectedCategoryLabel(): string {
    const id = this.favCategory();
    return this.favCategories.find((c) => c.id === id)?.label ?? '';
  }

  passwordStrength(): number {
    const len = this.password.length;
    if (len >= 12) return 4;
    if (len >= 8) return 3;
    if (len >= 5) return 2;
    if (len > 0) return 1;
    return 0;
  }

  passwordStrengthLabel(): string {
    const s = this.passwordStrength();
    if (s >= 4) return 'Fuerte';
    if (s === 3) return 'Buena';
    if (s === 2) return 'Débil';
    return 'Muy débil';
  }

  strengthColor(): string {
    const s = this.passwordStrength();
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    return colors[Math.max(0, s - 1)] ?? '#e0e0da';
  }

  onGoogle(): void {
    void this.runAuthAction(async () => {
      await this.auth.signInWithGoogle();
    });
  }

  onSubmitNewPassword(event: Event): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.doneHint.set(null);

    if (this.password.length < 8) {
      this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    void this.runAuthAction(async () => {
      await this.auth.updatePassword(this.password);
      this.password = '';
      this.passwordConfirm = '';
      this.doneHint.set('Ya puedes usar tu nueva contraseña.');
      this.done.set(true);
      window.setTimeout(() => void this.router.navigateByUrl('/'), 1500);
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.doneHint.set(null);

    if (this.mode() === 'new-password') {
      this.onSubmitNewPassword(event);
      return;
    }

    const email = this.email.trim();
    if (!email) {
      this.errorMessage.set('Introduce tu email.');
      return;
    }

    if (this.mode() === 'reset') {
      void this.runAuthAction(async () => {
        await this.auth.resetPassword(email);
        this.doneHint.set('Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.');
        this.done.set(true);
      });
      return;
    }

    if (!this.password) {
      this.errorMessage.set('Introduce tu contraseña.');
      return;
    }

    if (this.mode() === 'register') {
      if (!this.name.trim()) {
        this.errorMessage.set('Introduce tu nombre.');
        return;
      }
      if (this.password.length < 8) {
        this.errorMessage.set('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (!this.favCategory()) {
        this.errorMessage.set('Elige una categoría favorita.');
        return;
      }
      if (!this.favDriverId.trim()) {
        this.errorMessage.set('Elige tu piloto favorito.');
        return;
      }
    }

    void this.runAuthAction(async () => {
      if (this.mode() === 'login') {
        await this.auth.signInWithPassword(email, this.password);
        this.done.set(true);
        window.setTimeout(() => void this.router.navigateByUrl('/'), 1200);
        return;
      }

      const driver = this.selectedDriverOption();
      const seriesId = this.favCategory()!;
      const favorites: UserFavoriteDto[] = [
        {
          kind: 'category',
          seriesId,
          label: this.selectedCategoryLabel(),
        },
        {
          kind: 'driver',
          seriesId,
          driverId: this.favDriverId,
          label: driver?.driver,
          teamLabel: driver?.team,
        },
      ];

      const outcome = await this.auth.signUpWithPassword(
        email,
        this.password,
        this.name.trim(),
        favorites,
      );

      if (outcome === 'confirm_email') {
        this.doneHint.set(
          'Te hemos enviado un email de confirmación. Ábrelo y luego inicia sesión.',
        );
      }
      this.done.set(true);
    });
  }

  private async runAuthAction(action: () => Promise<void>): Promise<void> {
    await this.auth.init(!this.auth.configured());
    if (!this.auth.configured()) {
      this.errorMessage.set(
        this.auth.initError() ??
          'Autenticación no disponible. Configura Supabase en el servidor.',
      );
      return;
    }

    this.loading.set(true);
    try {
      await action();
    } catch (err) {
      this.errorMessage.set(this.auth.mapAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private icon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
