export interface NewsArticle {
  id: string;
  cat: string;
  tag: string;
  hot: boolean;
  title: string;
  excerpt: string;
  author: string;
  source: string;
  time: string;
  readTime: string;
  featured: boolean;
  imageUrl: string | null;
  url: string;
  publishedAt: string | null;
}

export interface NewsFeedResponse {
  category: string;
  tag: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: NewsArticle[];
}

/** Artículos por página en el listado de noticias. */
export const NEWS_PAGE_SIZE = 12;

export interface NewsCategoryTab {
  id: string;
  label: string;
  accent: string;
}

export const NEWS_PAGE_CATEGORIES: NewsCategoryTab[] = [
  { id: 'f1', label: 'Formula 1', accent: '#FFD100' },
  { id: 'f2', label: 'Formula 2', accent: '#0090FF' },
  { id: 'f3', label: 'Formula 3', accent: '#9E9E9E' },
  { id: 'motogp', label: 'MotoGP', accent: '#0052CC' },
  { id: 'moto2', label: 'Moto 2', accent: '#FF6B35' },
  { id: 'moto3', label: 'Moto 3', accent: '#52C41A' },
  { id: 'fe', label: 'Formula E', accent: '#00C8FF' },
  { id: 'wrc', label: 'WRC', accent: '#FF8C00' },
  { id: 'indycar', label: 'IndyCar', accent: '#B8002D' },
];

export const NEWS_TAGS = [
  'Todos',
  'Análisis',
  'Técnica',
  'Paddock',
  'Mercado',
  'Resultados',
  'Entrevista',
] as const;

export type NewsTag = (typeof NEWS_TAGS)[number];
