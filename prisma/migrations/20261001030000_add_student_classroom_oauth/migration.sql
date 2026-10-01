ALTER TABLE "Task" ADD COLUMN "sourceGroupId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "sourceGroupId" TEXT;
DROP INDEX IF EXISTS "Task_sourceProvider_sourceExternalId_userId_key";
DROP INDEX IF EXISTS "Announcement_sourceProvider_sourceExternalId_key";
CREATE UNIQUE INDEX "Task_sourceProvider_sourceGroupId_sourceExternalId_userId_key" ON "Task"("sourceProvider", "sourceGroupId", "sourceExternalId", "userId");
CREATE UNIQUE INDEX "Announcement_sourceProvider_sourceGroupId_sourceExternalId_key" ON "Announcement"("sourceProvider", "sourceGroupId", "sourceExternalId");

CREATE TABLE "AnnouncementRecipient" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  CONSTRAINT "AnnouncementRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnnouncementRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AnnouncementRecipient_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnnouncementRecipient_userId_announcementId_key" ON "AnnouncementRecipient"("userId", "announcementId");
CREATE INDEX "AnnouncementRecipient_userId_idx" ON "AnnouncementRecipient"("userId");

CREATE TABLE "ClassroomConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "googleUserId" TEXT NOT NULL,
  "googleEmail" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT NOT NULL,
  "scopes" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'connected',
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassroomConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassroomConnection_userId_key" UNIQUE ("userId"),
  CONSTRAINT "ClassroomConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ClassroomCourse" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "section" TEXT,
  "description" TEXT,
  "courseState" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassroomCourse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassroomCourse_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ClassroomConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClassroomCourse_connectionId_courseId_key" ON "ClassroomCourse"("connectionId", "courseId");
