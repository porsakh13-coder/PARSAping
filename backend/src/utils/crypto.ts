import crypto from "crypto";
import { env } from "../config/env";

// ENCRYPTION_KEY must be a base64-encoded 32-byte key (openssl rand -base64 32)
const KEY = Buffer.from(env.ENCRYPTION_KEY, "base64");

if (KEY.length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY must decode to exactly 32 bytes (base64). Generate with: openssl rand -base64 32"
  );
}

/**
 * Encrypts a secret (e.g. a WireGuard private key) using AES-256-GCM.
 * Returns a single string: iv.authTag.ciphertext (all base64), safe to store in DB.
 * NEVER log the plaintext input to this function.
 */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    "."
  );
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf-8");
}

/** Cryptographically random, URL-safe subscription token. */
export function generateSubscriptionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
