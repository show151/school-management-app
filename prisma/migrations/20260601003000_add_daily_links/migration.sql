-- CreateTable
CREATE TABLE "DailyLink" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLink_pkey" PRIMARY KEY ("id")
);

-- Seed default daily links.
INSERT INTO "DailyLink" ("id", "label", "description", "href", "sortOrder", "updatedAt")
VALUES
  ('8a566b5f-719a-4a2b-9c9f-a5efcbe31a31', 'Google Classroom', '授業資料・提出', 'https://classroom.google.com/', 10, CURRENT_TIMESTAMP),
  ('3e97e96b-a8f2-4039-a271-74fc698a0f34', 'Microsoft Teams', '連絡・オンライン授業', 'https://teams.microsoft.com/', 20, CURRENT_TIMESTAMP),
  ('70f92299-413c-4b6e-8316-d36ef92abb72', 'Google Drive', '資料保管', 'https://drive.google.com/', 30, CURRENT_TIMESTAMP),
  ('7f7c9ef8-0e5b-4110-9f36-c11bdc75d252', 'Gmail', 'メール確認', 'https://mail.google.com/', 40, CURRENT_TIMESTAMP);
