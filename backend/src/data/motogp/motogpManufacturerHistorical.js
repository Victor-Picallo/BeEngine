/**
 * Campeonatos mundiales de constructores (clase 500cc / MotoGP) y totales históricos.
 * Cifras de referencia hasta 2025; la temporada en curso se enriquece con Pulse Live.
 * Fuentes: palmarés FIM / Wikipedia «World Constructors' Champions».
 */

export const MANUFACTURER_HISTORICAL_THROUGH = 2025;

/** @type {Record<string, { championships: number, championshipYears: number[], totalWins: number, totalPodiums: number, totalPoles: number, maxCareerPts: number }>} */
export const MANUFACTURER_HISTORICAL = {
  honda: {
    championships: 25,
    championshipYears: [
      1966, 1983, 1984, 1985, 1989, 1992, 1994, 1995, 1996, 1997, 1998, 1999, 2001, 2002, 2003,
      2004, 2006, 2011, 2012, 2013, 2014, 2016, 2017, 2018, 2019,
    ],
    totalWins: 318,
    totalPodiums: 890,
    totalPoles: 145,
    maxCareerPts: 1114,
  },
  yamaha: {
    championships: 14,
    championshipYears: [
      1974, 1975, 1986, 1987, 1988, 1990, 1991, 1993, 2000, 2005, 2008, 2009, 2010, 2015,
    ],
    totalWins: 198,
    totalPodiums: 620,
    totalPoles: 98,
    maxCareerPts: 958,
  },
  ducati: {
    championships: 7,
    championshipYears: [2007, 2020, 2021, 2022, 2023, 2024, 2025],
    totalWins: 95,
    totalPodiums: 280,
    totalPoles: 62,
    maxCareerPts: 2448,
  },
  aprilia: {
    championships: 0,
    championshipYears: [],
    totalWins: 12,
    totalPodiums: 45,
    totalPoles: 8,
    maxCareerPts: 420,
  },
  ktm: {
    championships: 0,
    championshipYears: [],
    totalWins: 8,
    totalPodiums: 35,
    totalPoles: 5,
    maxCareerPts: 380,
  },
  suzuki: {
    championships: 7,
    championshipYears: [1976, 1977, 1978, 1979, 1980, 1981, 1982],
    totalWins: 94,
    totalPodiums: 210,
    totalPoles: 40,
    maxCareerPts: 720,
  },
};

export const getManufacturerHistorical = (manufacturerSlug) => {
  const key = String(manufacturerSlug || '')
    .trim()
    .toLowerCase();
  return MANUFACTURER_HISTORICAL[key] ?? null;
};

export const isManufacturerChampionYear = (manufacturerSlug, year) => {
  const hist = getManufacturerHistorical(manufacturerSlug);
  return Boolean(hist?.championshipYears?.includes(Number(year)));
};
