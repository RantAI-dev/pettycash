import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionEdge } from "@/lib/auth-edge";

const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_API_PREFIXES = ["/api/auth/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_API_PREFIXES) if (pathname.startsWith(p)) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionEdge(cookie);

  if (isPublic(pathname)) {
    // If already logged in and hitting /login, bounce to dashboard
    if (pathname === "/login" && session) {
      const next = req.nextUrl.searchParams.get("from") || "/";
      return NextResponse.redirect(new URL(next, req.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Apply to everything except Next.js internals, static files, and the brand assets.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.png|rant-ai\\.png|logo-rantai\\.png).*)",
  ],
};
