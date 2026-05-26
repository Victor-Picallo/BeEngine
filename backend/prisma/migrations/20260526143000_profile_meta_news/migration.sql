-- CreateTable
CREATE TABLE "profile_meta" (
    "id" TEXT NOT NULL,
    "seriesId" VARCHAR(16),
    "kind" VARCHAR(24) NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "category" VARCHAR(16) NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "tag" VARCHAR(24),
    "summary" TEXT,
    "imageUrl" TEXT,
    "pubDate" TIMESTAMP(3),
    "hot" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_meta_seriesId_kind_idx" ON "profile_meta"("seriesId", "kind");

-- CreateIndex
CREATE INDEX "news_articles_category_pubDate_idx" ON "news_articles"("category", "pubDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_link_key" ON "news_articles"("link");
