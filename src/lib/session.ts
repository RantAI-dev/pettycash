import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, signSession, verifySession } from "@/lib/auth";

/**
 * Returns the authenticated user id (from the signed session cookie),
 * or null if no valid session is present.
 *
 * In normal operation, middleware blocks unauthenticated requests before they
 * reach API route handlers — but route handlers should still treat this as
 * possibly-null for defense in depth.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const jar = await cookies();
  const session = verifySession(jar.get(SESSION_COOKIE_NAME)?.value);
  return session?.uid ?? null;
}

/**
 * Same as getCurrentUserId, but throws when there's no valid session.
 * Use in API route handlers downstream of the auth middleware — they should
 * never actually receive an unauthenticated request, but the type contract
 * here is non-null so call sites stay clean.
 */
export async function requireUserId(): Promise<string> {
  const uid = await getCurrentUserId();
  if (!uid) {
    // Surface as a 401 by throwing — Next.js route handlers wrap this into a
    // 500 response, but the auth middleware should have prevented this path.
    throw new UnauthorizedError();
  }
  return uid;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
