import bcrypt from "bcryptjs";
import { pool } from "./pool";
import { env } from "../config/env";

async function seed() {
  if (!env.ADMIN_DEFAULT_EMAIL || !env.ADMIN_DEFAULT_PASSWORD) {
    console.log(
      "ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD not set in .env — skipping admin bootstrap."
    );
    await pool.end();
    return;
  }

  if (env.ADMIN_DEFAULT_PASSWORD.length < 12) {
    console.error(
      "ADMIN_DEFAULT_PASSWORD is too short (min 12 chars). Refusing to seed a weak admin account."
    );
    process.exit(1);
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    env.ADMIN_DEFAULT_EMAIL,
  ]);

  if (existing.rows.length > 0) {
    console.log("Admin user already exists, skipping.");
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(env.ADMIN_DEFAULT_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, 'admin', TRUE)`,
    [env.ADMIN_DEFAULT_EMAIL, hash]
  );

  console.log(`Admin user created: ${env.ADMIN_DEFAULT_EMAIL}`);
  await pool.end();
}

seed();
