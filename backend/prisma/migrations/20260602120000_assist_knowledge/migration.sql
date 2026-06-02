-- CreateTable
CREATE TABLE "assist_knowledge_snapshots" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "scope" VARCHAR(16) NOT NULL DEFAULT 'global',
    "tags" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assist_knowledge_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assist_knowledge_snapshots_slug_key" ON "assist_knowledge_snapshots"("slug");

-- CreateIndex
CREATE INDEX "assist_knowledge_snapshots_isActive_scope_idx" ON "assist_knowledge_snapshots"("isActive", "scope");
