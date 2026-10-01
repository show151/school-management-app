ALTER TABLE "Announcement" ADD COLUMN "sourceProvider" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "sourceExternalId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Task" ADD COLUMN "sourceProvider" TEXT;
ALTER TABLE "Task" ADD COLUMN "sourceExternalId" TEXT;
ALTER TABLE "Task" ADD COLUMN "sourceUrl" TEXT;

CREATE TABLE "IntegrationEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Announcement_sourceProvider_sourceExternalId_key" ON "Announcement"("sourceProvider", "sourceExternalId");
CREATE UNIQUE INDEX "Task_sourceProvider_sourceExternalId_userId_key" ON "Task"("sourceProvider", "sourceExternalId", "userId");
CREATE UNIQUE INDEX "IntegrationEvent_provider_externalId_key" ON "IntegrationEvent"("provider", "externalId");
CREATE INDEX "IntegrationEvent_provider_receivedAt_idx" ON "IntegrationEvent"("provider", "receivedAt");
