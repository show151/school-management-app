-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "TestScheduleEntry" ALTER COLUMN "dayOfWeek" DROP DEFAULT;
