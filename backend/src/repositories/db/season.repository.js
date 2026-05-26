const CURRENT_YEAR = parseInt(process.env.CURRENT_SEASON_YEAR || '2026', 10);

/** @param {string} seriesId f1 | f2 | f3 | motogp | moto2 | moto3 */
export function seasonIdFor(seriesId, year = CURRENT_YEAR) {
  return `${seriesId}_${year}`;
}

export function currentSeasonYear() {
  return CURRENT_YEAR;
}
