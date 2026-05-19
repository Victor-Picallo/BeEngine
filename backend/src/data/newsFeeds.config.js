/**
 * Fuentes RSS por categoría BeEngine.
 * @typedef {{ url: string, source: string, linkIncludes?: string, categoryIncludes?: string }} NewsFeedSource
 */

/** @type {Record<string, NewsFeedSource[]>} */
export const NEWS_FEEDS_BY_CATEGORY = {
  f1: [
    { url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml', source: 'BBC Sport' },
    { url: 'https://www.crash.net/rss/f1', source: 'Crash.net', linkIncludes: '/f1/' },
    { url: 'https://www.formula1.com/en/latest/all.xml', source: 'Formula 1' },
    { url: 'https://www.motorsport.com/rss/f1/news/', source: 'Motorsport.com' },
  ],
  f2: [
    { url: 'https://www.motorsport.com/rss/fia-f2/news/', source: 'Motorsport.com' },
    { url: 'https://www.crash.net/rss/f1', source: 'Crash.net', linkIncludes: '/f2/' },
  ],
  motogp: [
    { url: 'https://www.crash.net/rss/motogp', source: 'Crash.net', linkIncludes: '/motogp/' },
    { url: 'https://www.motorsport.com/rss/category/motogp/', source: 'Motorsport.com' },
  ],
  fe: [
    { url: 'https://www.crash.net/rss/fe', source: 'Crash.net', linkIncludes: '/fe/' },
  ],
  wrc: [
    { url: 'https://www.motorsport.com/rss/wrc/news/', source: 'Motorsport.com' },
  ],
  indycar: [
    { url: 'https://www.crash.net/rss/indycar', source: 'Crash.net', linkIncludes: '/indycar/' },
  ],
};

export const NEWS_TAGS = [
  'Todos',
  'Análisis',
  'Técnica',
  'Paddock',
  'Mercado',
  'Resultados',
  'Entrevista',
];
