// Edge-runtime-safe variant: only verifies signed session cookies using Web
// Crypto (no Node "crypto" import). Mirrors src/lib/auth.ts exactly.

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  return "petty-dev-secret-DO-NOT-USE-IN-PROD";
}

function base64urlToBytes(input: string): Uint8Array {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToHex(arr: ArrayBuffer | Uint8Array): string {
  const view = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  let out = "";
  for (let i = 0; i < view.length; i++) out += view[i].toString(16).padStart(2, "0");
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySessionEdge(
  cookieValue: string | undefined | null,
): Promise<{ uid: string; exp: number } | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf(".");
  if (dot < 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const expected = bytesToHex(sigBytes);

  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const bytes = base64urlToBytes(payloadB64);
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json) as { uid: string; exp: number };
    if (typeof obj.uid !== "string") return null;
    if (typeof obj.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) return null;
    return obj;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = "petty-session";
