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
  supabaseUrl: string;
  supabaseAnonKey: string;
  oauthRedirectUrl: string;
  hint?: string | null;
}
