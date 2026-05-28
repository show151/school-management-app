import * as PrismaPkg from "@prisma/client";
// Some generated @prisma/client distributions expose different module shapes
// so we use a runtime lookup and keep a local relaxed type to avoid
// build-time type resolution errors in environments where the type export
// is not present in the package's d.ts surface.
const PrismaClientCtor = (PrismaPkg as any).PrismaClient ?? (PrismaPkg as any).default;
type PrismaClientType = any;
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
