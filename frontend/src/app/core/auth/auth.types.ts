export type UserFavoriteKind = 'category' | 'driver';

export interface UserFavoriteDto {
  kind: UserFavoriteKind;
  seriesId: string;
  driverId?: string | null;
  label?: string | null;
  teamLabel?: string | null;
}

export interface MeProfile {
  id: string;
  email: string;
  displayName: string | null;
  favorites: UserFavoriteDto[];
}

export interface AuthConfigResponse {
  configured: boolean;
  serverAuth?: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  oauthRedirectUrl: string;
  /** URLs que deben estar en Supabase → Authentication → Redirect URLs */
  supabaseRedirectUrls?: string[];
  hint?: string | null;
}
