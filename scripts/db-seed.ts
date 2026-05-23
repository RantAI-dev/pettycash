/**
 * Wipes and re-seeds the demo data.
 *  · Local PGlite (default): seeds ./.pglite
 *  · Remote: when DATABASE_URL points at a Neon URL, seeds that database
 *
 * Run with: bun run db:seed
 */
import "dotenv/config";

async function main() {
  const { seedDatabase } = await import("../src/lib/db/seed-db");
  const { useNeon } = await import("../src/lib/db/client");
  console.log(`→ Seeding demo data (${useNeon ? "neon" : "pglite"})…`);
  const stats = await seedDatabase();
  console.log("✓ Done:", stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
