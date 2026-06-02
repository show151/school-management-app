-- CreateTable
CREATE TABLE "TestSchedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestScheduleEntry" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "TestScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestScheduleEntry_scheduleId_period_key" ON "TestScheduleEntry"("scheduleId", "period");

-- AddForeignKey
ALTER TABLE "TestScheduleEntry" ADD CONSTRAINT "TestScheduleEntry_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TestSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable
DROP TABLE "Test";
