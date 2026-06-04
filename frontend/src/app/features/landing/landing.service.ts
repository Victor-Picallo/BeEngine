import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import type { NewsArticle } from '../news/news.types';
import type { SeriesId } from '../../core/series/series.types';
import type { JolpikaCalendarRace, JolpikaDriverStanding } from '../f1-live/f1-live.types';
import { absoluteMediaUrl } from '../constructors/constructors-media';
import { resolveDriverHeadshotUrl, teamColor } from '../drivers/drivers-shared';
import {
  LANDING_CATEGORIES_META,
  type LandingCategoryMeta,
} from './landing.data';

export interface LandingCategoryView extends LandingCategoryMeta {
  facts: [string, string][];
  leaderName: string;
  leaderTeam: string;
  leaderPoints: number;
  headshotUrl: string;
  teamColorHex: string;
}

export interface LandingShowcaseFavorite {
  name: string;
  sub: string;
  tc: string;
  initials: string;
  headshotUrl: string;
}

export interface LandingPageData {
  categories: LandingCategoryView[];
  heroCircuitUrl: string | null;
  heroNextRaceLabel: string;
  news: NewsArticle[];
  favorites: LandingShowcaseFavorite[];
}

interface LandingSeriesPayload {
  standings: JolpikaDriverStanding[];
  calendar: JolpikaCalendarRace[];
}

interface LandingApiResponse {
  source: string;
  series: Record<string, LandingSeriesPayload>;
  news: NewsArticle[];
}

const LANDING_CACHE_KEY = 'beengine.landing.db.v3';

/** Mezcla F1 + MotoGP para el bloque de noticias del landing (6 artículos). */
export function mergeLandingNewsArticles(
  f1: NewsArticle[],
  motogp: NewsArticle[],
): NewsArticle[] {
  return [...f1, ...motogp].slice(0, 6);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function pickNextRace(calendar: JolpikaCalendarRace[]): JolpikaCalendarRace | null {
  const today = new Date().toISOString().slice(0, 10);
  return calendar.find((r) => r.date >= today) ?? calendar[calendar.length - 1] ?? null;
}

function formatRaceShort(name: string | undefined | null): string {
  if (!name?.trim()) return '—';
  return name
    .replace(/^FORMULA\s*1\s+/i, '')
    .replace(/^Grand Prix of\s+/i, '')
    .replace(/\s+Grand Prix$/i, '')
    .replace(/^GP\s+/i, '')
    .trim();
}

function truncateLabel(text: string, max: number): string {
  const v = text.trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1).trimEnd()}…`;
}

function buildCategoryView(
  meta: LandingCategoryMeta,
  drivers: JolpikaDriverStanding[],
  calendar: JolpikaCalendarRace[],
): LandingCategoryView {
  const leader = drivers[0];
  const next = pickNextRace(calendar);
  const leaderName = leader?.driver ?? '—';
  const leaderTeam = leader?.team ?? '—';
  const points = leader?.points ?? 0;
  const sid = meta.id as SeriesId;

  return {
    ...meta,
    leaderName,
    leaderTeam,
    leaderPoints: points,
    headshotUrl: leader
      ? resolveDriverHeadshotUrl(leader.driverId ?? '', leader.driver, leader.headshotUrl, {
          size: 'card',
          seriesId: sid,
        })
      : '',
    teamColorHex: teamColor(leaderTeam, leader?.teamColor),
    facts: [
      ['Líder', truncateLabel(leaderName, 20)],
      ['Puntos', String(points)],
      ['Equipo', truncateLabel(leaderTeam, 16)],
      ['Próximo GP', truncateLabel(formatRaceShort(next?.raceName) || '—', 14)],
    ],
  };
}

function buildFavorites(
  f1: JolpikaDriverStanding[],
  motogp: JolpikaDriverStanding[],
  f2: JolpikaDriverStanding[],
): LandingShowcaseFavorite[] {
  const picks: { row: JolpikaDriverStanding; series: SeriesId; label: string }[] = [];
  if (f1[0]) picks.push({ row: f1[0], series: 'f1', label: 'F1' });
  if (motogp[0]) picks.push({ row: motogp[0], series: 'motogp', label: 'MotoGP' });
  if (f2[0]) picks.push({ row: f2[0], series: 'f2', label: 'F2' });

  return picks.map(({ row, series, label }) => {
    const tc = teamColor(row.team, row.teamColor);
    return {
      name: row.driver,
      sub: `${row.team} · ${label}`,
      tc,
      initials: initials(row.driver),
      headshotUrl: resolveDriverHeadshotUrl(row.driverId ?? '', row.driver, row.headshotUrl, {
        size: 'card',
        seriesId: series,
      }),
    };
  });
}

function mapLandingPayload(pack: LandingApiResponse): LandingPageData {
  const standings = (id: SeriesId): JolpikaDriverStanding[] =>
    pack.series[id]?.standings ?? [];
  const calendars = (id: SeriesId): JolpikaCalendarRace[] => pack.series[id]?.calendar ?? [];

  const categories = LANDING_CATEGORIES_META.map((meta) =>
    buildCategoryView(meta, standings(meta.id as SeriesId), calendars(meta.id as SeriesId)),
  );

  const f1Cal = calendars('f1');
  const nextF1 = pickNextRace(f1Cal);
  const circuitUrl =
    absoluteMediaUrl(nextF1?.circuitSvgUrl) ??
    absoluteMediaUrl(nextF1?.circuitImageUrl) ??
    null;

  const heroNextRaceLabel = nextF1
    ? `${nextF1.raceName}${nextF1.date ? ` · ${nextF1.date}` : ''}`
    : 'Temporada 2026';

  return {
    categories,
    heroCircuitUrl: circuitUrl,
    heroNextRaceLabel,
    news: [],
    favorites: buildFavorites(standings('f1'), standings('motogp'), standings('f2')),
  };
}

export function buildPlaceholderLandingData(): LandingPageData {
  const categories = LANDING_CATEGORIES_META.map((meta) =>
    buildCategoryView(meta, [], []),
  );
  return {
    categories,
    heroCircuitUrl: null,
    heroNextRaceLabel: '',
    news: [],
    favorites: [],
  };
}

export function readLandingCache(): LandingPageData | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LandingApiResponse;
    if (!parsed?.series) return null;
    return mapLandingPayload(parsed);
  } catch {
    return null;
  }
}

export function writeLandingCache(pack: LandingApiResponse): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const { news: _news, ...core } = pack;
    sessionStorage.setItem(LANDING_CACHE_KEY, JSON.stringify({ ...core, news: [] }));
  } catch {
    /* quota */
  }
}

@Injectable({ providedIn: 'root' })
export class LandingService {
  private readonly api = inject(ApiService);

  load(): Observable<LandingPageData> {
    return this.api.get<LandingApiResponse>('/landing').pipe(
      map((pack) => {
        writeLandingCache(pack);
        return mapLandingPayload(pack);
      }),
      catchError(() => of(buildPlaceholderLandingData())),
    );
  }
}
