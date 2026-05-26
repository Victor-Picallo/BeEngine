-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "accent" VARCHAR(16),

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "nationality" VARCHAR(8),
    "headshotUrl" TEXT,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constructors" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,

    CONSTRAINT "constructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constructor_seasons" (
    "seasonId" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamColor" VARCHAR(16),
    "logoUrl" TEXT,
    "bikeImageUrl" TEXT,

    CONSTRAINT "constructor_seasons_pkey" PRIMARY KEY ("seasonId","constructorId")
);

-- CreateTable
CREATE TABLE "driver_season_entries" (
    "seasonId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "gridOrder" INTEGER,
    "teamColor" VARCHAR(16),
    "headshotUrl" TEXT,

    CONSTRAINT "driver_season_entries_pkey" PRIMARY KEY ("seasonId","driverId")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "raceName" TEXT NOT NULL,
    "circuitName" TEXT,
    "locality" TEXT,
    "country" TEXT,
    "date" VARCHAR(10),
    "time" VARCHAR(12),
    "status" VARCHAR(24),
    "externalEventId" TEXT,
    "circuitId" TEXT,
    "circuitSvgUrl" TEXT,
    "circuitImageUrl" TEXT,
    "resultsAvailable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_results" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sessionKey" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "session_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_standings" (
    "seasonId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "podiums" INTEGER NOT NULL DEFAULT 0,
    "poles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "driver_standings_pkey" PRIMARY KEY ("seasonId","driverId")
);

-- CreateTable
CREATE TABLE "constructor_standings" (
    "seasonId" TEXT NOT NULL,
    "constructorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "constructor_standings_pkey" PRIMARY KEY ("seasonId","constructorId")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT,
    "source" VARCHAR(32),
    "status" VARCHAR(16) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "meta" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_seriesId_year_key" ON "seasons"("seriesId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "events_seasonId_round_key" ON "events"("seasonId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "session_results_eventId_sessionKey_key" ON "session_results"("eventId", "sessionKey");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_seasons" ADD CONSTRAINT "constructor_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_seasons" ADD CONSTRAINT "constructor_seasons_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_season_entries" ADD CONSTRAINT "driver_season_entries_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_results" ADD CONSTRAINT "session_results_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_standings" ADD CONSTRAINT "driver_standings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constructor_standings" ADD CONSTRAINT "constructor_standings_constructorId_fkey" FOREIGN KEY ("constructorId") REFERENCES "constructors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
