import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import {
  createClient,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthConfigResponse, MeProfile, UserFavoriteDto } from './auth.types';

const PENDING_BOOTSTRAP_KEY = 'beengine_pending_bootstrap';

interface PendingBootstrap {
  displayName: string;
  favorites: UserFavoriteDto[];
}
import {
  sidebarFavoriteRowsFromProfile,
  sidebarFavoritesFromProfile,
} from './auth-favorites.utils';
import type { Favorite } from '../../data/sports.data';
import { authErrorMessage } from './auth-error.messages';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly apiBaseUrl = environment.apiUrl.replace(/\/$/, '');

  private client: SupabaseClient | null = null;
  private initPromise: Promise<void> | null = null;
  private profileRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private profileRefreshInFlight: Promise<MeProfile | null> | null = null;

  readonly ready = signal(false);
  readonly configured = signal(false);
  readonly session = signal<Session | null>(null);
  readonly profile = signal<MeProfile | null>(null);
  readonly initError = signal<string | null>(null);
  /** Tras el primer GET /api/me (o intento fallido). */
  readonly profileSettled = signal(false);
  /** Sesión temporal tras el enlace de “restablecer contraseña”. */
  readonly passwordRecovery = signal(false);

  readonly isLoggedIn = computed(() => Boolean(this.session()));
  readonly isPasswordRecovery = computed(() => this.passwordRecovery());
  readonly displayName = computed(() => {
    const profile = this.profile();
    if (profile?.displayName?.trim()) return profile.displayName.trim();
    const user = this.session()?.user;
    const meta = user?.user_metadata as { full_name?: string } | undefined;
    if (meta?.full_name?.trim()) return meta.full_name.trim();
    const email = user?.email ?? profile?.email;
    if (email) return email.split('@')[0] ?? email;
    return 'Usuario';
  });
  readonly sidebarFavoriteRows = computed(() => {
    const favs = this.profile()?.favorites;
    return favs?.length ? sidebarFavoriteRowsFromProfile(favs) : [];
  });
  readonly sidebarFavorites = computed((): Favorite[] => {
    const favs = this.profile()?.favorites;
    return favs?.length ? sidebarFavoritesFromProfile(favs) : [];
  });

  accessToken(): string | null {
    return this.session()?.access_token ?? null;
  }

  /** @param force Vuelve a pedir /auth/config (p. ej. tras reiniciar el API). */
  init(force = false): Promise<void> {
    if (force) {
      this.initPromise = null;
      this.initError.set(null);
    }
    if (!this.initPromise) {
      this.initPromise = this.loadConfigAndSession();
    }
    return this.initPromise;
  }

  private async loadConfigAndSession(): Promise<void> {
    try {
      const body = await firstValueFrom(
        this.http.get<{ success: boolean; data: AuthConfigResponse }>(
          `${this.apiBaseUrl}/auth/config`,
        ),
      );
      if (!body?.success || !body.data) {
        throw new Error('Respuesta inválida de /auth/config');
      }
      const data = body.data;
      const url = environment.supabaseUrl || data.supabaseUrl;
      const anonKey = environment.supabaseAnonKey || data.supabaseAnonKey;
      const ok = Boolean(data.configured && url && anonKey);

      this.configured.set(ok);
      if (!ok) {
        this.initError.set(
          data.hint?.trim() ||
            'Autenticación no configurada. Añade SUPABASE_URL y SUPABASE_ANON_KEY en backend/.env y reinicia el API.',
        );
        return;
      }

      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });

      if (this.isRecoveryLanding()) {
        this.passwordRecovery.set(true);
      }

      this.client.auth.onAuthStateChange((event, sess) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.passwordRecovery.set(true);
        }
        this.session.set(sess);
        if (!sess) {
          this.profile.set(null);
          this.profileSettled.set(false);
          this.passwordRecovery.set(false);
          return;
        }
        if (this.passwordRecovery()) return;
        if (!this.shouldRefreshProfileOnEvent(event)) return;
        this.scheduleProfileRefresh();
      });

      const { data: sessionData } = await this.client.auth.getSession();
      this.session.set(sessionData.session);
      if (sessionData.session && !this.passwordRecovery()) {
        this.scheduleProfileRefresh(true);
      }
    } catch (err) {
      this.initError.set(this.describeInitFailure(err));
    } finally {
      this.ready.set(true);
    }
  }

  private supabase(): SupabaseClient {
    if (!this.client) {
      throw new Error('Auth no inicializado');
    }
    return this.client;
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.supabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data } = await this.supabase().auth.getSession();
    this.session.set(data.session);
    await this.refreshProfile();
    await this.applyPendingBootstrap();
  }

  async signUpWithPassword(
    email: string,
    password: string,
    displayName: string,
    favorites: UserFavoriteDto[],
  ): Promise<'session' | 'confirm_email'> {
    const { data, error } = await this.supabase().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName.trim() },
      },
    });
    if (error) throw error;

    if (data.session) {
      this.session.set(data.session);
      await this.bootstrapProfile(displayName, favorites);
      return 'session';
    }
    this.savePendingBootstrap({ displayName, favorites });
    return 'confirm_email';
  }

  async resetPassword(email: string): Promise<void> {
    const redirectTo = `${window.location.origin}/login?tab=new-password`;
    const { error } = await this.supabase().auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase().auth.updateUser({ password });
    if (error) throw error;
    this.passwordRecovery.set(false);
    this.clearRecoveryHashFromUrl();
    const { data } = await this.supabase().auth.getSession();
    this.session.set(data.session);
    if (data.session) {
      await this.refreshProfile();
      await this.applyPendingBootstrap();
    }
  }

  private isRecoveryLanding(): boolean {
    if (typeof window === 'undefined') return false;
    const search = new URLSearchParams(window.location.search);
    if (search.get('tab') === 'new-password') return true;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return false;
    return new URLSearchParams(hash).get('type') === 'recovery';
  }

  private shouldRefreshProfileOnEvent(event: string): boolean {
    return event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION';
  }

  /** Evita ráfagas de GET /api/me (y 429 en Supabase Auth). */
  private scheduleProfileRefresh(immediate = false): void {
    if (this.passwordRecovery() || !this.session()) return;
    if (this.profileRefreshTimer) {
      clearTimeout(this.profileRefreshTimer);
      this.profileRefreshTimer = null;
    }
    const run = () => {
      this.profileRefreshTimer = null;
      void this.refreshProfile().then(() => this.applyPendingBootstrap());
    };
    if (immediate) {
      run();
      return;
    }
    this.profileRefreshTimer = setTimeout(run, 400);
  }

  private clearRecoveryHashFromUrl(): void {
    if (typeof window === 'undefined') return;
    const path = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(window.history.state, '', path);
  }

  async signInWithGoogle(): Promise<void> {
    const redirectTo = `${window.location.origin}/login?tab=onboarding`;
    const { error } = await this.supabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }

  /** Sin favoritos guardados (p. ej. primer login con Google). */
  needsOnboarding(): boolean {
    if (!this.session() || this.passwordRecovery()) return false;
    if (!this.profileSettled()) return false;
    return (this.profile()?.favorites?.length ?? 0) === 0;
  }

  defaultDisplayName(): string {
    return this.displayName();
  }

  /** Quita tokens OAuth del hash tras procesar la sesión. */
  clearOAuthHashFromUrl(): void {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (!params.get('access_token') && params.get('type') !== 'recovery') return;
    const path = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(window.history.state, '', path);
  }

  async signOut(): Promise<void> {
    await this.supabase().auth.signOut();
    this.session.set(null);
    this.profile.set(null);
    this.profileSettled.set(false);
  }

  async bootstrapProfile(
    displayName: string,
    favorites: UserFavoriteDto[],
  ): Promise<MeProfile> {
    const body = await firstValueFrom(
      this.http.post<{ success: boolean; data: MeProfile }>(
        `${this.apiBaseUrl}/me/bootstrap`,
        { displayName, favorites },
      ),
    );
    this.profile.set(body.data);
    return body.data;
  }

  async refreshProfile(): Promise<MeProfile | null> {
    if (!this.session() || this.passwordRecovery()) return null;
    if (this.profileRefreshInFlight) return this.profileRefreshInFlight;
    this.profileRefreshInFlight = (async () => {
      try {
        const body = await firstValueFrom(
          this.http.get<{ success: boolean; data: MeProfile }>(`${this.apiBaseUrl}/me`),
        );
        this.profile.set(body.data);
        return body.data;
      } catch (err) {
        if (err instanceof HttpErrorResponse && err.status === 429) {
          console.warn('[auth] Perfil no cargado: límite de peticiones (429). Reintenta en un momento.');
        }
        this.profile.set(null);
        return null;
      } finally {
        this.profileSettled.set(true);
        this.profileRefreshInFlight = null;
      }
    })();
    return this.profileRefreshInFlight;
  }

  mapAuthError(err: unknown): string {
    return authErrorMessage(err);
  }

  private describeInitFailure(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) {
        return 'El API no tiene /auth/config. Reinicia el backend (npm run dev en la carpeta backend).';
      }
      if (err.status === 0) {
        return `No hay conexión con el API (${this.apiBaseUrl}). Comprueba que el servidor esté en marcha.`;
      }
      if (err.status >= 500) {
        return 'El servidor de autenticación respondió con error. Revisa los logs del backend.';
      }
    }
    return 'No se pudo conectar con el servidor de autenticación.';
  }

  private savePendingBootstrap(payload: PendingBootstrap): void {
    try {
      sessionStorage.setItem(PENDING_BOOTSTRAP_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }

  private readPendingBootstrap(): PendingBootstrap | null {
    try {
      const raw = sessionStorage.getItem(PENDING_BOOTSTRAP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingBootstrap;
      if (!parsed?.displayName || !Array.isArray(parsed.favorites)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private clearPendingBootstrap(): void {
    try {
      sessionStorage.removeItem(PENDING_BOOTSTRAP_KEY);
    } catch {
      /* ignore */
    }
  }

  private async applyPendingBootstrap(): Promise<void> {
    if (!this.session()) return;
    const pending = this.readPendingBootstrap();
    if (!pending) return;
    const existing = this.profile()?.favorites?.length ?? 0;
    if (existing > 0) {
      this.clearPendingBootstrap();
      return;
    }
    try {
      await this.bootstrapProfile(pending.displayName, pending.favorites);
    } finally {
      this.clearPendingBootstrap();
    }
  }
}
