import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getRequiredEnv } from "@/lib/env";

type PrismaClientWithAdapter = PrismaClient;

const pool = new Pool({
  connectionString: getRequiredEnv("DATABASE_URL"),
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientWithAdapter;
};

export const prisma: PrismaClientWithAdapter =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}