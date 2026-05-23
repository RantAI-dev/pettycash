import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 6) {
    throw new Error("password must be at least 6 characters");
  }
  const salt = randomBytes(16);
  const hash = await scryptAsync(plain, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  if (!stored || !plain) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  try {
    const actual = await scryptAsync(plain, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ============================================================================
// Session cookie (HMAC-SHA256 signed)
// ============================================================================

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET env var must be set to at least 16 characters in production");
  }
  // Dev-only fallback — clearly marked
  return "petty-dev-secret-DO-NOT-USE-IN-PROD";
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signSession(uid: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const payload = { uid, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
  return `${payloadB64}.${sig}`;
}

export function verifySession(cookieValue: string | undefined | null): { uid: string; exp: number } | null {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf(".");
  if (dot < 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  try {
    const decoded = base64urlDecode(payloadB64).toString("utf8");
    const obj = JSON.parse(decoded) as { uid: string; exp: number };
    if (typeof obj.uid !== "string") return null;
    if (typeof obj.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "petty-session";
export const SESSION_TTL_SECONDS = DEFAULT_TTL_SECONDS;
