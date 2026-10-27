import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

const url = new URL(process.env.DATABASE_URL!);

/**
 * Managed Postgres (Aiven) requires TLS verified against the project CA,
 * supplied as a PEM string in DB_SSL_CA. Literal "\n" escapes are normalised so
 * single-line deployments (Docker/Vercel) work too.
 */
const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: { ca, rejectUnauthorized: true },
  },
  verbose: true,
  strict: true,
});
