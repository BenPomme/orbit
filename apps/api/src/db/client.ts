import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? null;
}

export function isDatabaseConfigured() {
  return getDatabaseUrl() !== null;
}

export function getDb() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: databaseUrl,
  });

  return drizzle(pool);
}
