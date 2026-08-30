import { Pool } from "pg";
import { env } from "../config/env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  // Never log secrets/keys; this is just the pg pool error handler.
  console.error("Unexpected PostgreSQL pool error:", err.message);
});
