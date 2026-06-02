-- AlterTable: 曜日を追加し、同一セルに複数教科を登録可能にする
ALTER TABLE "TestScheduleEntry" ADD COLUMN "dayOfWeek" TEXT NOT NULL DEFAULT '月';

-- DropIndex
DROP INDEX IF EXISTS "TestScheduleEntry_scheduleId_period_key";
