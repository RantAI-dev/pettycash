# Petty — RantAI Petty Cash

Internal petty cash management for RantAI, ported from the Claude Design prototype to a deployable Next.js app.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Drizzle ORM · PGlite (local) / Neon (production) · Bun runtime · TypeScript.

## Local development (zero-config)

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

That's it. Local dev uses an **embedded Postgres** (PGlite) that stores data on disk at `./.pglite` — no daemon, no docker, no Neon account needed. Migrations are applied automatically on the first request, and the demo seed (65 transactions, 4 cycles, 12 users, full audit trail) loads on first `/api/state` hit.

The "Demo: Login sebagai" switcher in the sidebar / login page changes the active user — handy for testing role-gated views (requester / custodian / finance_admin / super_admin). Reset Demo Data from the user menu re-seeds the local DB.

### Schema changes

```bash
# 1. Edit src/lib/db/schema.ts
# 2. Generate a new SQL migration:
bun run db:generate
# 3. Restart the dev server — the migration is auto-applied to ./.pglite.
```

If you want to nuke and rebuild local data: delete `./.pglite/` and reload.

## Deploying to Vercel (via GitHub Actions)

Pushes to `main` trigger `.github/workflows/deploy.yml`, which syncs the
GitHub repo secrets into the Vercel project's production env, then deploys.

### One-time setup

1. **Create a Neon-backed Postgres** in Vercel (Project → Storage → Create
   Database → Neon) or directly on neon.tech. Copy the pooled connection
   string — that's your `DATABASE_URL`.
2. **Push the schema to Neon** (one-time):
   ```bash
   DATABASE_URL='postgresql://…neon.tech/…?sslmode=require' bun run db:push
   ```
3. **Create a Vercel project** (any way — `vercel link`, dashboard import,
   or just `vercel deploy` once locally). Note the project + org IDs from
   `.vercel/project.json`.
4. **Generate a Vercel access token** at
   <https://vercel.com/account/tokens>.
5. **Set GitHub repo secrets** (Settings → Secrets and variables → Actions):

   | Secret                  | Purpose                                                       |
   | ----------------------- | ------------------------------------------------------------- |
   | `VERCEL_TOKEN`          | Personal access token from Vercel                             |
   | `VERCEL_ORG_ID`         | From `.vercel/project.json` after running `vercel link`       |
   | `VERCEL_PROJECT_ID`     | From `.vercel/project.json` after running `vercel link`       |
   | `SESSION_SECRET`        | `openssl rand -hex 32` — used to HMAC-sign session cookies    |
   | `SUPER_ADMIN_EMAIL`     | Login email for the seeded super admin                        |
   | `SUPER_ADMIN_NAME`      | Display name for the seeded super admin                       |
   | `SUPER_ADMIN_PASSWORD`  | Login password for the seeded super admin                     |
   | `SUPER_ADMIN_DIVISI`    | Optional. Defaults to "Operations".                           |
   | `DATABASE_URL`          | Postgres URL (Neon / Vercel Postgres)                         |

   You can set them all in one shot with the GitHub CLI:
   ```bash
   gh secret set VERCEL_TOKEN          -b"$VERCEL_TOKEN"
   gh secret set VERCEL_ORG_ID         -b"$VERCEL_ORG_ID"
   gh secret set VERCEL_PROJECT_ID     -b"$VERCEL_PROJECT_ID"
   gh secret set SESSION_SECRET        -b"$(openssl rand -hex 32)"
   gh secret set SUPER_ADMIN_EMAIL     -b"admin@rantai.dev"
   gh secret set SUPER_ADMIN_NAME      -b"Super Admin"
   gh secret set SUPER_ADMIN_PASSWORD  -b"$(read -s pw; echo $pw)"
   gh secret set DATABASE_URL          -b"$DATABASE_URL"
   ```

### Every push to `main`

The workflow:

1. Removes + re-adds each secret on Vercel's *production* env (this lets you
   rotate values in GitHub Actions secrets — they propagate on the next push).
2. Pulls the Vercel env and builds with `vercel build --prod`.
3. Deploys the prebuilt artifacts with `vercel deploy --prebuilt --prod`.

The first request to the deployed app calls `ensureSeeded()` which inserts
the super admin from env vars + a default fund + default categories. No
demo users, transactions or top-up cycles are created — that's all real
data once the super admin starts inviting users.

To rotate the super-admin password later: change `SUPER_ADMIN_PASSWORD` in
GitHub → push to main → after the deploy, hit **Reset Demo Data** in the
user menu (calls `POST /api/demo-reset`) to re-run the seed with the new
password.

## Scripts

| Command              | Purpose                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `bun run dev`        | Start Next.js dev server (PGlite auto-init on first request)                     |
| `bun run build`      | Production build                                                                 |
| `bun run start`      | Run the production build                                                         |
| `bun run db:generate`| Emit a new SQL migration under `drizzle/` after editing `schema.ts`              |
| `bun run db:push`    | Push schema to a remote Neon URL (set `DATABASE_URL`)                            |
| `bun run db:seed`    | Wipe & re-seed demo data (uses PGlite locally, Neon if `DATABASE_URL` is set)    |
| `bun run db:studio`  | Open Drizzle Studio at https://local.drizzle.studio (needs `DATABASE_URL` set)   |

## API surface

All mutations go through `/api/*`. Quick map:

| Method  | Path                                       | Purpose                                  |
| ------- | ------------------------------------------ | ---------------------------------------- |
| GET     | `/api/state`                               | Full denormalized state for current user |
| POST    | `/api/session`                             | Switch active user (cookie-based)        |
| POST    | `/api/transactions`                        | Create a new laporan pengeluaran         |
| POST    | `/api/transactions/:id/verify`             | Custodian verifies bukti                 |
| POST    | `/api/transactions/:id/reject`             | Custodian rejects with reason            |
| POST    | `/api/transactions/:id/close`              | Lock a verified transaction              |
| POST    | `/api/transactions/:id/upload`             | Append bukti files                       |
| POST    | `/api/transactions/:id/note`               | Append an audit-trail note               |
| POST    | `/api/users`                               | Invite user                              |
| PATCH   | `/api/users/:id`                           | Update role / divisi / active            |
| PATCH   | `/api/fund`                                | Update fund settings                     |
| PUT     | `/api/categories`                          | Replace category list                    |
| PATCH   | `/api/notif-settings`                      | Toggle email-notification prefs          |
| POST    | `/api/topup`                               | Submit a top-up cycle request            |
| POST    | `/api/topup/:id/approve`                   | Finance approves top-up                  |
| POST    | `/api/notifications/:id/read`              | Mark single notif as read                |
| POST    | `/api/notifications/mark-all`              | Mark all read                            |
| POST    | `/api/demo-reset`                          | Wipe & re-seed demo data                 |

## Authentication

Real email + password auth. Sessions are HMAC-signed cookies (no JWT lib, no NextAuth — just `node:crypto` + Web Crypto on the edge).

**The first user is seeded from environment variables** when the database is initialized:

```bash
SUPER_ADMIN_EMAIL=admin@rantai.dev
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_PASSWORD=...        # required in production
SUPER_ADMIN_DIVISI=Operations   # optional
SESSION_SECRET=...              # 16+ chars, required in production
```

Demo users (Sarah, Pak Risman, Pak Simon, etc.) ship without passwords by default — they exist in the data but can't log in. Two ways to test other roles:

1. **`DEMO_USERS_PASSWORD=…`** — gives every demo user the same password. Sign in as any of them via `/login`.
2. **Super-admin impersonation** — once logged in as the super admin, the sidebar user menu has an *Impersonasi (Demo)* section that swaps the active session to any of the canonical demo roles.

Middleware (`src/middleware.ts`) protects every route except `/login` and `/api/auth/*`. Unauthenticated API hits return `401`; unauthenticated page hits redirect to `/login?from=…`.

To rotate the super-admin password: change `SUPER_ADMIN_PASSWORD` in your env and run `bun run db:seed` (or click *Reset Demo Data* in the user menu — calls `POST /api/demo-reset` which re-runs the seed).

## Notes

- **Audit trail is append-only.** Events are never edited or deleted; `note_added` events are the only writable surface on a closed transaction.
- **Approval is out-of-band.** RantAI handles spending approval over WhatsApp / verbal. This app verifies the *bukti*; it does not approve the spend. Transactions over the pre-approval threshold require a recorded WA-approval note.
