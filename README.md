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

Pushes to `main` trigger `.github/workflows/deploy.yml`. The workflow only
runs `vercel pull` → `vercel build` → `vercel deploy --prebuilt --prod`.
**Vercel is the single source of truth for all runtime environment variables.**

### One-time setup

1. **Create the Vercel project + Neon DB**, easiest path:
   ```bash
   vercel link --yes --scope <your-team-slug> --project pettycash
   vercel integration add neon --scope <your-team-slug>
   ```
   Neon auto-injects `DATABASE_URL` + ~18 related Postgres env vars into
   all three Vercel envs (Production, Preview, Development).

2. **Set the app's auth env vars on Vercel** (one-time, never in this repo):
   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))" \
     | vercel env add SESSION_SECRET production
   printf 'admin@rantai.dev' | vercel env add SUPER_ADMIN_EMAIL    production
   printf 'Super Admin'      | vercel env add SUPER_ADMIN_NAME     production
   printf 'Operations'       | vercel env add SUPER_ADMIN_DIVISI   production
   printf 'YOUR-PASSWORD'    | vercel env add SUPER_ADMIN_PASSWORD production
   # Repeat for `preview` and `development` if you want preview deploys to work.
   ```

3. **Push the Drizzle schema to Neon**:
   ```bash
   vercel env pull .env.local --yes --environment=production
   DATABASE_URL_UNPOOLED=$(grep '^DATABASE_URL_UNPOOLED=' .env.local | cut -d'=' -f2- | tr -d '"')
   psql "$DATABASE_URL_UNPOOLED" -f drizzle/0000_*.sql
   ```

4. **Generate a Vercel personal access token** at
   <https://vercel.com/account/tokens>. Then set just three GitHub secrets:
   ```bash
   gh secret set VERCEL_TOKEN      -b"vercel_xxx..."           # from step 4
   gh secret set VERCEL_ORG_ID     -b"$(jq -r .orgId .vercel/project.json)"
   gh secret set VERCEL_PROJECT_ID -b"$(jq -r .projectId .vercel/project.json)"
   ```

### Every push to `main`

1. Preflight checks `VERCEL_TOKEN`/`ORG_ID`/`PROJECT_ID` exist.
2. `vercel pull` fetches the latest production env from Vercel.
3. `vercel build --prod` builds with those env vars.
4. `vercel deploy --prebuilt --prod` uploads the prebuilt artifacts.

The first request to a freshly-seeded DB calls `ensureSeeded()` which
inserts the super admin from env vars + a default fund + default
categories. **No demo users, transactions or top-up cycles are seeded.**

### Rotating secrets

Change the value on Vercel (`vercel env add NAME production --force` or via
the dashboard), then either push a commit to `main` or hit *Reset Demo
Data* in the super admin's user menu (calls `POST /api/demo-reset`) to
re-seed with the new password. Existing sessions are invalidated when
`SESSION_SECRET` rotates because their HMAC stops verifying.

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
