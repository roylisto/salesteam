import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

/**
 * Managed Postgres (Aiven) requires TLS verified against the project CA,
 * supplied as a PEM string in DB_SSL_CA. Literal "\n" escapes are normalised so
 * single-line deployments (Docker/Vercel) work too.
 */
const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

if (!ca) {
  throw new Error("DB_SSL_CA is not set. Copy .env.example to .env.");
}

/**
 * Reuse the connection pool across hot reloads in development so we don't
 * exhaust Postgres connections.
 */
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: Number(process.env.DB_POOL_SIZE ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { ca, rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
export { client as pgClient };
export type Database = typeof db;
