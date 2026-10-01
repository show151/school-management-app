ALTER TABLE "IntegrationEvent" ADD COLUMN "payload" JSONB;
ALTER TABLE "IntegrationEvent" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'received';
ALTER TABLE "IntegrationEvent" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "IntegrationEvent" ADD COLUMN "processedAt" TIMESTAMP(3);
CREATE INDEX "IntegrationEvent_status_receivedAt_idx" ON "IntegrationEvent"("status", "receivedAt");
