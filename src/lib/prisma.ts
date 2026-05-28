import * as PrismaPkg from "@prisma/client";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
const PrismaClientCtor = (PrismaPkg as any).PrismaClient ?? (PrismaPkg as any).default;
import { PrismaPg } from "@prisma/adapter-pg";
import { getRequiredEnv } from "@/lib/env";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: getRequiredEnv("DATABASE_URL"),
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientType;
};

export const prisma: PrismaClientType =
  globalForPrisma.prisma ??
  new (PrismaClientCtor as any)({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
