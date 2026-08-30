import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  BASE_URL: required("BASE_URL", "http://localhost:4000"),
  FRONTEND_URL: required("FRONTEND_URL", "http://localhost:3000"),

  DATABASE_URL: required("DATABASE_URL"),

  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES ?? "30d",

  ENCRYPTION_KEY: required("ENCRYPTION_KEY"),
  COOKIE_SECURE: (process.env.COOKIE_SECURE ?? "true") === "true",

  ADMIN_DEFAULT_EMAIL: process.env.ADMIN_DEFAULT_EMAIL,
  ADMIN_DEFAULT_PASSWORD: process.env.ADMIN_DEFAULT_PASSWORD,

  WG_SIMULATED: (process.env.WG_SIMULATED ?? "true") === "true",
  WG_DEFAULT_MTU: Number(process.env.WG_DEFAULT_MTU ?? 1420),
  WG_DEFAULT_DNS: process.env.WG_DEFAULT_DNS ?? "1.1.1.1",
  WG_DEFAULT_PORT: Number(process.env.WG_DEFAULT_PORT ?? 51820),
  WG_CLIENT_IP_RANGE: process.env.WG_CLIENT_IP_RANGE ?? "10.66.0.0/16",

  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 100),

  BACKEND_PORT: Number(process.env.BACKEND_PORT ?? 4000),
};
