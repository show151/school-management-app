CREATE TABLE "TeamsConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "microsoftUserId" TEXT NOT NULL,
    "microsoftEmail" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamsConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamsConnection_userId_key" ON "TeamsConnection"("userId");

ALTER TABLE "TeamsConnection" ADD CONSTRAINT "TeamsConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
