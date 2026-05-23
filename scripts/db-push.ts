/**
 * Pushes the Drizzle schema to a remote Postgres (Neon / Vercel Postgres).
 * For local PGlite there's nothing to push — migrations are applied
 * automatically on first connect.
 *
 * Run with: bun run db:push
 */
import "dotenv/config";
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Local dev uses PGlite automatically — set DATABASE_URL only for remote pushes.");
  process.exit(1);
}
if (!/\bneon\.tech\b/i.test(url)) {
  console.error(
    "DATABASE_URL doesn't look like a Neon URL.\n" +
      "  · Local dev: nothing to push, PGlite auto-applies migrations.\n" +
      "  · Remote: paste your Neon/Vercel Postgres URL into .env.local.",
  );
  process.exit(1);
}

console.log("→ Pushing Drizzle schema to remote Postgres…");
execSync("bunx --bun drizzle-kit push", { stdio: "inherit" });
console.log("✓ Done.");
