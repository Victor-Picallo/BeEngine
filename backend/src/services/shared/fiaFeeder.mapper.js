/** Puntos carrera larga (feature) F2/F3. */
const FEATURE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const TEAM_ALIASES = {
  TRIDENT: 'Trident',
  'TRIDENT ': 'Trident',
  HitechGP: 'Hitech',
  HITECH: 'Hitech',
  'PREMA Powerteam': 'Prema Racing',
  'PREMA Racing': 'Prema Racing',
  'MP Motorsport': 'MP Motorsport',
  'ART Grand Prix': 'ART Grand Prix',
  'DAMS Lucas Oil': 'DAMS Lucas Oil',
  'Rodin Motorsport': 'Rodin Motorsport',
  'Campos Racing': 'Campos Racing',
  'Invicta Racing': 'Invicta Racing',
  'Van Amersfoort Racing': 'Van Amersfoort Racing',
  'AIX Racing': 'AIX Racing',
};

const normTeam = (name) => TEAM_ALIASES[name?.trim()] ?? name?.trim() ?? '';

const normName = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const featurePoints = (pos) => FEATURE_POINTS[pos - 1] ?? 0;

const mapStatus = (row, maxLaps) => {
  if (row.ResultStatus === 'Ret') return 'DNF';
  if (row.ResultStatus === 'DNS') return 'DNS';
  if (row.ResultStatus === 'DSQ') return 'DSQ';
  if (maxLaps > 0 && row.LapsCompleted > 0 && row.LapsCompleted < maxLaps) return 'DNF';
  return 'Finished';
};

const formatTime = (row) => {
  if (row.FinishPosition === 1) return row.TimeOrFinishReason ?? null;
  const gap = row.Gap ?? row.Interval;
  if (!gap) return null;
  return gap.startsWith('+') ? gap : `+${gap}`;
};

/**
 * @param {import('../../data/f2/f2DriversGrid2026.js').F2DriverGridEntry[] | import('../../data/f3/f3DriversGrid2026.js').F3DriverGridEntry[]} driversGrid
 */
export const buildDriverResolver = (driversGrid) => {
  const byTla = new Map();
  const byFullName = new Map();

  const F2_TLA = {
    TSO: 'tsolov', MIN: 'mini', CAM: 'camara', VAN: 'van_hoepen', MIY: 'miyata',
    LEO: 'leon', BEG: 'beganovic', DUR: 'durksen', INT: 'inthraphuvasak', DUN: 'dunne',
    GOE: 'goethe', MAI: 'maini', HER: 'herta', BOY: 'boya', VAR: 'varrone',
    STE: 'stenshorne', MON: 'montoya', BIL: 'bilinski', VIL: 'villagomez',
    FIT: 'fittipaldi', BEN: 'bennett', SHI: 'shields',
  };

  const F3_TLA = {
    UGO: 'ugochukwu', PIN: 'del_pino', SLA: 'slater', KAT: 'kato', DEL: 'deligny',
    GLA: 'gladysz', BEN: 'benavides', CLE: 'clerot', BAD: 'badoer', STR: 'stromsted',
    NAK: 'nakamura', NAE: 'nael', COL: 'colnaghi', WHA: 'wharton', YAM: 'yamakoshi',
    LAC: 'lacorte', TAP: 'taponen', MCL: 'mclaughlin', GIU: 'giusti', SHA: 'sharp',
    HEU: 'heuzenroeder', HO: 'ho', BAR: 'barrichello', XIE: 'xie', DAV: 'david',
    DEP: 'de_palo', GAR: 'garfias', SHN: 'shin',
  };

  const extraTla = { ...F2_TLA, ...F3_TLA };

  for (const g of driversGrid) {
    byFullName.set(normName(g.driver), g.driverId);
    const parts = normName(g.driver).split(' ');
    if (parts.length >= 2) {
      byFullName.set(normName(`${parts[0]} ${parts[parts.length - 1]}`), g.driverId);
    }
  }

  return ({ tla, forename, surname }) => {
    const code = (tla ?? '').toUpperCase();
    if (extraTla[code]) return extraTla[code];
    const full = normName(`${forename ?? ''} ${surname ?? ''}`);
    if (byFullName.has(full)) return byFullName.get(full);
    const last = normName(surname ?? '');
    for (const [k, id] of byFullName) {
      if (k.endsWith(last) || k.includes(last)) return id;
    }
    return last.replace(/\s+/g, '_') || code.toLowerCase() || 'unknown';
  };
};

/**
 * @param {{ constructorId: string, team: string }[]} constructorsGrid
 */
export const buildTeamResolver = (constructorsGrid) => {
  const byTeam = Object.fromEntries(constructorsGrid.map((c) => [normName(c.team), c.constructorId]));
  return (teamName) => {
    const n = normTeam(teamName);
    return byTeam[normName(n)] ?? n.toLowerCase().replace(/\s+/g, '_').replace(/_lucas_oil/g, '');
  };
};

/**
 * Calendario solo desde datos FIA (sin mezclar mocks locales).
 * @param {object} pageData Calendar pageData
 */
export const normalizeFeederCalendar = (pageData) => {
  const races = pageData?.Races ?? [];

  return races.map((r) => {
    const fr = (r.Sessions ?? []).find((s) => s.SessionShortName === 'FR');
    const sr = (r.Sessions ?? []).find((s) => s.SessionShortName === 'SR');
    const date = (fr?.SessionStartTime ?? r.RaceEndDate ?? r.RaceStartDate ?? '').slice(0, 10);
    const time = fr?.SessionStartTime
      ? new Date(fr.SessionStartTime).toISOString().slice(11, 19) + 'Z'
      : null;
    const country = r.CountryName ?? '';

    return {
      round: r.RoundNumber,
      raceName: country ? `${country} Grand Prix` : (r.CircuitName ?? r.CircuitShortName ?? ''),
      circuitName: r.CircuitName ?? r.CircuitShortName ?? '',
      locality: r.CircuitShortName ?? '',
      country,
      date,
      time,
      sprintDate: sr?.SessionStartTime?.slice(0, 10) ?? null,
      resultsAvailable: Boolean(fr?.SessionResultsAvailable),
      fiaRaceId: r.RaceId,
    };
  });
};

/**
 * @param {object} pageData Standings Driver pageData
 * @param {ReturnType<typeof buildDriverResolver>} resolveDriverId
 * @param {import('../../data/f2/f2DriversGrid2026.js').F2DriverGridEntry[]} driversGrid
 */
export const normalizeDriverStandings = (pageData, resolveDriverId, driversGrid) => {
  const standings = pageData?.Standings ?? [];
  const gridById = Object.fromEntries(driversGrid.map((g) => [g.driverId, g]));

  return standings.map((s) => {
    const driverId = resolveDriverId({
      tla: s.TLA,
      forename: s.FullName?.split(' ')?.[0],
      surname: s.FullName?.split(' ').slice(1).join(' '),
    });
    const g = gridById[driverId];
    const wins = (s.RacePoints ?? []).filter((pair) => pair?.[1] === 25).length;

    return {
      pos: s.Position,
      driver: g?.driver ?? s.FullName,
      driverId,
      team: g?.team ?? normTeam(s.TeamName),
      points: s.TotalPoints ?? 0,
      wins,
      nationality: g?.nationality ?? s.CountryCode ?? '',
      gridOrder: g?.gridOrder ?? 999,
    };
  });
};

/**
 * @param {object} pageData Standings Team pageData
 * @param {ReturnType<typeof buildTeamResolver>} resolveConstructorId
 * @param {{ constructorId: string, team: string, nationality: string, gridOrder: number }[]} constructorsGrid
 */
export const normalizeConstructorStandings = (pageData, resolveConstructorId, constructorsGrid) => {
  const standings = pageData?.Standings ?? [];
  const gridById = Object.fromEntries(constructorsGrid.map((c) => [c.constructorId, c]));

  return standings.map((s) => {
    const team = normTeam(s.TeamName ?? s.DisplayName);
    const constructorId = resolveConstructorId(team) || s.TeamID?.toString();
    const g = gridById[constructorId];
    const wins = (s.RacePoints ?? []).filter((pair) => pair?.[1] === 25).length;

    return {
      pos: s.Position,
      team: g?.team ?? team,
      constructorId: g?.constructorId ?? constructorId,
      points: s.TotalPoints ?? 0,
      wins,
      nationality: g?.nationality ?? '',
      gridOrder: g?.gridOrder ?? 999,
    };
  });
};

/**
 * @param {object} pageData Results?raceid= pageData
 * @param {ReturnType<typeof buildDriverResolver>} resolveDriverId
 * @param {ReturnType<typeof buildTeamResolver>} resolveConstructorId
 */
export const normalizeFeatureRaceResults = (pageData, resolveDriverId, resolveConstructorId) => {
  const sessions = pageData?.SessionResults ?? [];
  const fr = sessions.find((s) => s.SessionShortName === 'FR');
  if (!fr?.SessionResultsAvailable || !fr.Results?.length) {
    throw new Error('FIA feature race results not available');
  }

  const qual = sessions.find((s) => s.SessionShortName === 'Qual');
  const gridByTla = qual?.Results
    ? Object.fromEntries(qual.Results.map((r) => [r.TLA, r.FinishPosition]))
    : {};

  const maxLaps = Math.max(...fr.Results.map((r) => r.LapsCompleted ?? 0));

  const results = fr.Results.map((r) => {
    const driverId = resolveDriverId({
      tla: r.TLA,
      forename: r.DriverForename,
      surname: r.DriverSurname,
    });
    const team = normTeam(r.TeamName);
    const pos = r.FinishPosition ?? parseInt(r.DisplayFinishPosition, 10);

    return {
      position: pos,
      driverId,
      driver: `${r.DriverForename} ${r.DriverSurname}`.trim(),
      team,
      constructorId: resolveConstructorId(team),
      grid: gridByTla[r.TLA] ?? 0,
      laps: r.LapsCompleted ?? 0,
      status: mapStatus(r, maxLaps),
      points: featurePoints(pos),
      time: formatTime(r),
    };
  });

  const frSession = fr;
  const date = (frSession.SessionStartTime ?? pageData.RaceEndDate ?? '').slice(0, 10);

  return {
    round: pageData.RoundNumber,
    raceName: `${pageData.CountryName ?? pageData.CircuitInformation?.CircuitShortName} Grand Prix`,
    circuitName: pageData.CircuitInformation?.CircuitName ?? pageData.CircuitInformation?.CircuitShortName ?? '',
    date,
    results,
    fiaRaceId: pageData.RaceId,
  };
};

export const findLastCompletedRound = (calendarItems) => {
  const done = calendarItems.filter((r) => r.resultsAvailable);
  if (!done.length) return null;
  return done.reduce((a, b) => (a.round > b.round ? a : b));
};
