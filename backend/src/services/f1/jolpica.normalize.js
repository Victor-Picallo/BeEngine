export const normalizeCalendar = (raw, lastCompletedRound = 0) => {
  const races = raw?.MRData?.RaceTable?.Races ?? [];
  return races.map((r) => {
    const round = parseInt(r.round, 10);
    return {
      round,
      raceName: r.raceName,
      circuitName: r.Circuit.circuitName,
      circuitId: r.Circuit.circuitId ?? null,
      locality: r.Circuit.Location.locality,
      country: r.Circuit.Location.country,
      date: r.date,
      time: r.time ?? null,
      resultsAvailable: lastCompletedRound > 0 && round <= lastCompletedRound,
    };
  });
};

export const normalizeLastRace = (raw) => {
  const race = raw?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return normalizeRaceFromErgast(race);
};

export const normalizeRaceResults = (raw) => {
  const race = raw?.MRData?.RaceTable?.Races?.[0];
  if (!race) return null;
  return normalizeRaceFromErgast(race);
};

function normalizeRaceFromErgast(race) {
  return {
    raceName: race.raceName,
    round: parseInt(race.round, 10),
    circuitName: race.Circuit.circuitName,
    date: race.date,
    results: (race.Results ?? []).map((r) => ({
      position: parseInt(r.position, 10),
      driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
      driverId: r.Driver?.driverId ?? null,
      team: r.Constructor.name,
      constructorId: r.Constructor?.constructorId ?? null,
      grid: parseInt(r.grid, 10),
      laps: parseInt(r.laps, 10),
      status: r.status,
      points: parseFloat(r.points),
      time: r.Time?.time ?? null,
    })),
  };
}

export const normalizeDriverStandings = (raw) => {
  const list = raw?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings ?? [];
  return list.map((ds) => ({
    pos: parseInt(ds.position, 10),
    driver: `${ds.Driver.givenName} ${ds.Driver.familyName}`.trim(),
    driverId: ds.Driver?.driverId ?? '',
    team: ds.Constructors?.[0]?.name ?? 'Unknown',
    points: parseFloat(ds.points),
    wins: parseInt(ds.wins ?? '0', 10),
    nationality: ds.Driver.nationality,
  }));
};

export const normalizeConstructorStandings = (raw) => {
  const list = raw?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
  return list.map((cs) => ({
    pos: parseInt(cs.position, 10),
    team: cs.Constructor.name,
    constructorId: cs.Constructor.constructorId ?? '',
    points: parseFloat(cs.points),
    wins: parseInt(cs.wins ?? '0', 10),
    nationality: cs.Constructor.nationality,
  }));
};

export const normalizeCurrentSeasonDrivers = (raw) => {
  const drivers = raw?.MRData?.DriverTable?.Drivers ?? [];
  return drivers.map((d) => ({
    driverId: d.driverId,
    givenName: d.givenName,
    familyName: d.familyName,
    fullName: `${d.givenName} ${d.familyName}`.trim(),
    nationality: d.nationality,
  }));
};
