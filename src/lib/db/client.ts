import "server-only";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// Use the Neon HTTP driver when DATABASE_URL points at a real hosted Postgres
// (Neon). Otherwise — including when no URL is set — fall back to the embedded
// PGlite driver that stores data on disk under ./.pglite (gitignored), so
// local dev is zero-config.
export const useNeon = !!url && /\bneon\.tech\b/i.test(url);

type Db = PgliteDatabase<typeof schema> | NeonHttpDatabase<typeof schema>;

function createPglite(): { client: PGlite; db: PgliteDatabase<typeof schema> } {
  const dataDir = process.env.PGLITE_DATA_DIR
    ? path.resolve(process.env.PGLITE_DATA_DIR)
    : path.resolve(process.cwd(), ".pglite");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema });
  return { client, db };
}

function createNeon(): NeonHttpDatabase<typeof schema> {
  const sql = neon(url!);
  return drizzleNeon(sql, { schema });
}

const _pglite = !useNeon ? createPglite() : null;
export const db: Db = useNeon ? createNeon() : _pglite!.db;

let _migrationPromise: Promise<void> | null = null;

/**
 * Idempotently apply pending migrations. No-op for Neon (use `bun run db:push`
 * against the production URL). For PGlite, applies any SQL files under
 * ./drizzle on first call per process.
 */
export async function ensureReady(): Promise<void> {
  if (useNeon || !_pglite) return;
  if (_migrationPromise) return _migrationPromise;
  _migrationPromise = (async () => {
    const folder = path.resolve(process.cwd(), "drizzle");
    if (!existsSync(folder) || readdirSync(folder).filter((f) => f.endsWith(".sql")).length === 0) {
      return;
    }
    await migrate(_pglite.db, { migrationsFolder: folder });
  })();
  return _migrationPromise;
}

export { schema };
