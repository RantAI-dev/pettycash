import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireUserId } from "@/lib/session";

/**
 * Resolve the authenticated user and verify they hold one of the allowed roles.
 * Throws an Error if the user can't be found or the role is wrong — caller
 * should map that to a 401/403 response.
 */
export async function requireRole(allowed: Array<"requester" | "custodian" | "finance_admin" | "super_admin">) {
  const uid = await requireUserId();
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  const user = rows[0];
  if (!user) throw new ForbiddenError("session points at a user that no longer exists");
  if (!allowed.includes(user.role as (typeof allowed)[number])) {
    throw new ForbiddenError(`role ${user.role} is not allowed for this action`);
  }
  return user;
}

export class ForbiddenError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ForbiddenError";
  }
}
