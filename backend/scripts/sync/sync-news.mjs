/**
 * RSS → news_articles (cache persistente)
 * Uso: npm run db:sync:news
 */
import 'dotenv/config';
import { createPrismaClient } from '../../src/lib/prisma.js';
import { fetchCategoryArticles } from '../../src/services/shared/newsFeed.service.js';

const CATEGORIES = ['f1', 'motogp'];

const prisma = createPrismaClient();
if (!prisma) {
  console.error('DATABASE_URL no configurada');
  process.exit(1);
}

async function main() {
  let total = 0;
  for (const category of CATEGORIES) {
    const articles = await fetchCategoryArticles(category);
    for (const a of articles) {
      await prisma.newsArticle.upsert({
        where: { link: a.url },
        create: {
          id: a.id,
          category,
          title: a.title,
          link: a.url,
          tag: a.tag ?? null,
          summary: a.excerpt ?? null,
          imageUrl: a.imageUrl ?? null,
          pubDate: a.publishedAt ? new Date(a.publishedAt) : null,
          hot: Boolean(a.hot),
        },
        update: {
          title: a.title,
          tag: a.tag ?? null,
          summary: a.excerpt ?? null,
          imageUrl: a.imageUrl ?? null,
          pubDate: a.publishedAt ? new Date(a.publishedAt) : null,
          hot: Boolean(a.hot),
          fetchedAt: new Date(),
        },
      });
      total += 1;
    }
    console.log(`  ${category}: ${articles.length} artículos`);
  }
  console.log(`news_articles: ${total} filas actualizadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
