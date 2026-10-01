CREATE TABLE "IntegrationIdentity" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalGroupId" TEXT,
  "externalUserId" TEXT NOT NULL,
  "email" TEXT,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IntegrationIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IntegrationIdentity_provider_externalUserId_key" ON "IntegrationIdentity"("provider", "externalUserId");
CREATE INDEX "IntegrationIdentity_provider_email_idx" ON "IntegrationIdentity"("provider", "email");
CREATE INDEX "IntegrationIdentity_provider_externalGroupId_idx" ON "IntegrationIdentity"("provider", "externalGroupId");
