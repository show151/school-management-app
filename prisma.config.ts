import { defineConfig, env } from "prisma/config";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // The real environment can provide DATABASE_URL in production.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
