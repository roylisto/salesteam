# Salesteam — Agent Journal

> Handoff notes for AI agents doing "vibe coding" on this repo.
> Read this first; it captures the project context, conventions, and what has
> already been built so you can continue without re-discovering everything.
> Last updated: 2026-10-16.
>
> **⚠️ RULE: always update this file after making any change.** Whenever you add
> a table, page, action, env var, dependency, migration, or change a convention,
> append/refresh the relevant section here (feature status, schema, migration
> history, file map, gotchas) and bump the `Last updated` date. This file is the
> single handoff source so the next agent (or model) can pick up seamlessly.

---

## 1. What this project is

**Salesteam** is a multi-tenant B2B field-sales / distribution CRM. It is a
**Next.js App Router** application (not a mobile app), ported from an older
Laravel app. The domain covers:

- Organizations (tenants) with their own members, roles, areas, warehouses.
- Product catalogue, warehouses, outlets (customer stores), stock.
- Sales orders, invoices/finance, payment methods.
- Call visits (GPS check-in/out), routes, weekly route planning.
- Team hierarchy with per-area access scoping and user-defined roles.

**Shared-schema multi-tenancy:** every tenant-owned row carries
`organization_id`. One Postgres database hosts many companies; all queries are
scoped by organization in application code (there is no row-level security).

---

## 2. Tech stack

| Concern      | Choice                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| Framework    | **Next.js 16.4.2** (App Router, `src/` dir, React 19.3)                   |
| Language     | TypeScript 5 (`@/*` → `src/*` alias)                                      |
| Styling      | Tailwind CSS v4, shadcn/ui built on `@base-ui/react` + Radix primitives   |
| ORM          | **Drizzle ORM 0.45** with `postgres-js` 3.4                               |
| DB           | PostgreSQL                                                                |
| Validation   | Zod 4                                                                     |
| Auth         | Custom DB sessions (no NextAuth) — bcryptjs + httpOnly cookie             |
| Mail         | **nodemailer** over SMTP (password-reset emails)                          |
| File storage | S3-compatible object storage (Cloudeka, AWS SDK v3)                       |
| Misc         | `nuqs` (URL state), `sonner` (toasts), `lucide-react` (icons), `date-fns` |

### IMPORTANT — Next.js version warning

`AGENTS.md` warns this is **not** the Next.js from your training data; APIs and
conventions may differ. Before writing Next.js-specific code, read the relevant
guide under `node_modules/next/dist/docs/`. Note the app uses a **`proxy.ts`**
(middleware replacement) and `next dev` auto-writes the `AGENTS.md` block — keep
that block in commits.

---

## 3. Getting started

```bash
npm install
cp .env.example .env      # then fill in real values
npm run db:migrate        # apply migrations in ./drizzle
npm run dev               # http://localhost:3000
npx tsc --noEmit          # type-check (run before declaring work done)
npm run lint              # eslint
```

### Environment variables (`.env`)

| Var                                         | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                              | Postgres connection string (required)                |
| `DB_POOL_SIZE`                              | Connection pool size (default 10)                    |
| `NEXT_PUBLIC_APP_NAME`                      | Brand name (default "Salesteam")                     |
| `SESSION_COOKIE_NAME`                       | Session cookie name (default `salesteam_session`)    |
| `SESSION_TTL_DAYS`                          | Session lifetime (default 30)                        |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET`   | Object storage                                       |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage creds                                 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE`   | SMTP server (outgoing email)                         |
| `SMTP_USERNAME` / `SMTP_PASSWORD`           | SMTP credentials                                     |
| `SMTP_FROM`                                 | From address for outgoing email                      |
| `PASSWORD_RESET_MONTHLY_LIMIT`              | Max password resets per member per month (default 2) |

### DB scripts

- `npm run db:generate -- --name <migration-name>` — generate a migration from schema changes.
- `npm run db:migrate` — apply pending migrations.
- `npm run db:push` — push schema directly (dev only, bypasses migrations).
- `npm run db:studio` — Drizzle Studio.

Migrations live in `drizzle/` and are tracked in `drizzle/meta/_journal.json`.

---

## 4. Architecture

### 4.1 Routing & layout

```
src/app/
  page.tsx                     → landing
  (auth)/login, (auth)/register → public auth pages
  (auth)/forgot-password        → public password reset (2-step)
  (app)/layout.tsx              → requires user, renders <AppShell>
  (app)/dashboard               → dashboard
  (app)/master-data/areas       → area management
  (app)/settings/organization   → org settings (logo upload, currency, tz)
  (app)/settings/team           → team hierarchy + members
  (app)/settings/roles          → user-defined roles & permissions
  api/files/[...key]/route.ts   → authenticated S3 object streaming
```

- **`src/proxy.ts`** is the optimistic edge guard. It only checks that the
  session cookie exists; the authoritative check is in the DAL. Public routes:
  `/`, `/login`, `/register`, `/forgot-password`. Unauthenticated → redirect to
  `/login?next=...`; authenticated hitting a public route → redirect to `/dashboard`.
- **`src/components/app-shell.tsx`** renders the sidebar/header and filters nav
  items by the user's permission keys.

### 4.2 Auth & sessions

- Custom, DB-backed sessions. `sessions.id` is a 64-char hex token (PK),
  stored in an httpOnly cookie. See [session.ts](file:///Users/roy/Projects/salesteam/src/lib/session.ts).
- `loadSessionContext()` joins session → user → role (LEFT, soft-delete-aware)
  → organization and returns `null` for missing/expired/deactivated.
- `deleteSession()` and `pruneExpiredSessions()` **soft-delete** session rows.
- `getCurrentUser()` (in [auth.ts](file:///Users/roy/Projects/salesteam/src/lib/auth.ts)) is `React.cache`-memoized
  per render pass. It computes `permissions`.

### 4.3 Permissions & the virtual Admin

- Catalogue of module permission keys in
  [permissions.ts](file:///Users/roy/Projects/salesteam/src/lib/permissions.ts): `dashboard`, `products`,
  `outlets`, `warehouses`, `warehouse_movements`, `sales_inventory`,
  `sales_stock`, `orders`, `visits`, `finance`, `payments`, `areas`,
  `organization`, `team`, `roles`.
- **Roles are user-defined per organization.** There are **no** seeded/default
  roles (no manager/sales/finance presets). The old `DEFAULT_ROLE_PRESETS`
  concept was removed.
- **Admin is virtual, never stored.** There is no `admin` row in `roles`.
  Constants: `SYSTEM_ADMIN_ROLE_VALUE="admin"` (dropdown value),
  `OWNER_ROLE_SLUG="admin"` (reserved slug, rejected on role create/update).
  A user is admin when `isOrganizationOwner || isAdmin || role.slug === "admin"`.
- Admins implicitly get **every** permission (so new modules are automatically
  granted). Admin-only modules (`organization`, `roles`) are stripped from
  non-admin roles even if an old role row lists them.
- Helpers: `isAdmin()`, `can()`, `canAny()`, `requireUser()`, `requireAdmin()`,
  `requirePermission(key)`.

### 4.4 Soft delete (project-wide convention)

**Every table is soft-deleted — rows are never hard-deleted.**

- `src/db/schema/_shared.ts` defines the shared `timestamps` object which now
  includes `deletedAt` (`deleted_at timestamptz`). Every table that spreads
  `...timestamps` gets it automatically. `sessions` defines its columns
  inline, so it declares `deletedAt` manually.
- Helper: `notDeleted(table)` → `isNull(table.deletedAt)`. Import it from
  `@/db/schema` (it re-exports `_shared`).
- **All reads must filter** `notDeleted(<table>)` in the `WHERE` clause
  (including joins — e.g. `.leftJoin(roles, and(eq(...), notDeleted(roles)))`).
- **Deletes** become
  `await db.update(t).set({ deletedAt: new Date() }).where(...)` — never `db.delete(...)`.
- **Unique indexes are partial**: e.g.
  `uniqueIndex("users_email_unique").on(table.email).where(isNull(table.deletedAt))`.
  This lets a name/email/code/slug be reused after the original was deleted.

### 4.5 Team hierarchy & area scoping

- `users.reportsTo` is a self-referencing FK (`ON DELETE SET NULL`) — the
  reporting line.
- `user_area_assignments` maps a user to multiple `area_offices` (org-scoped).
- **Visibility:** non-admins only see their own subtree (self + all descendants),
  both in the Team page and in create/update/delete member actions.
- **Area inheritance:** a member's areas must be a **subset** of their
  reporting line's areas. E.g. a regional manager covering 3 areas can hand
  only those 3 down; each manager below only sees/passes on their assigned
  subset. Enforced in `createMember` / `updateMember`.
- Cycle guards prevent circular reporting lines (`wouldCreateCycle`).
- `deleteMember` soft-deletes the user, re-points direct reports to the deleted
  member's own manager (so the tree doesn't dangle), and soft-deletes their
  area assignments.
- The organization owner is protected: cannot be demoted, disabled, or deleted;
  can only be edited by themselves for profile fields.

### 4.6 Password reset (email temporary password)

Flow is a 2-step wizard on the public `/forgot-password` page:

1. **Request** — user enters their email. If no active account matches, we return
   an explicit error ("No account found with this email." / inactive message).
   Otherwise we check the per-month limit, generate a random temporary password,
   store only its **hash** in `password_reset_requests`, email the plaintext to
   the member, and move to step 2.
2. **Complete** — user enters the emailed temporary password + a new password.
   We verify the temp password against the stored hash (must be unused and not
   expired, 60 min TTL), set the new password hash, mark the request `usedAt`,
   and **soft-delete all of that user's sessions** (forced re-login).

- Limit: `PASSWORD_RESET_MONTHLY_LIMIT` (default 2; `.env` in dev is raised to
  100 for testing). Counted as requests created since the start of the current
  calendar month.
- Actions live in
  [password-reset.ts](file:///Users/roy/Projects/salesteam/src/lib/actions/password-reset.ts):
  `requestPasswordReset`, `completePasswordReset`.
- Email is sent via [mailer.ts](file:///Users/roy/Projects/salesteam/src/lib/mailer.ts)
  (`sendTemporaryPasswordEmail`). If `SMTP_HOST` is unset the message is logged
  to the server console instead of failing.
- The reset form calls the server actions directly with `useTransition` (not
  `useActionState`) so it can drive the step transitions explicitly.
- If SMTP delivery fails, the action rolls back the reset request (so a failed
  send does not consume one of the monthly attempts) and returns a friendly
  error instead of throwing — an SMTP error must never crash the page.

---

## 5. Database schema (tables)

Defined in `src/db/schema/*` and re-exported from `index.ts`.

- **organizations.ts** — `organizations` (tenant root: name, slug, legalName,
  email, phone, address, logoUrl, currency, timezone).
- **auth.ts** — `roles` (per-org, `permissions` jsonb), `users` (roleId,
  reportsTo, code, name, email, passwordHash, phone, avatarUrl, isActive,
  isAdmin, isOrganizationOwner, lastLoginAt), `sessions` (id, userId, expiresAt,
  ip, userAgent, deletedAt), `password_reset_requests` (userId, tokenHash,
  expiresAt, usedAt, timestamps — backing the forgot-password flow + monthly limit).
- **master-data.ts** — `area_offices`, `user_area_assignments`, `warehouses`,
  `products`, `outlets`, `warehouse_stocks`.
- **inventory.ts** — `stock_movements`, `stock_movement_items`, `sales_stocks`,
  `sales_stock_items`, `sales_inventory`.
- **orders.ts** — `orders`, `order_items`, `invoices`.
- **visits.ts** — `routes`, `route_assignments`, `visits`, `visit_stock_checks`,
  `outlet_assignment_requests`.
- **payments.ts** — `payment_methods`.
- **system.ts** — `scheduled_tasks`.
- **enums.ts** — Postgres enums: `stock_movement_type/status`, `sales_stock_type/status`,
  `visit_status`, `route_cycle_type`, `request_status`, `payment_method_type`,
  `invoice_status`, `task_status`.

### Conventions when adding a table

1. Use `primaryId()` for the PK (`bigint GENERATED ALWAYS AS IDENTITY`).
2. Spread `...timestamps` to get `createdAt`/`updatedAt`/`deletedAt`.
3. Add `organizationId` FK for tenant scoping when the row is tenant-owned.
4. Unique constraints → `uniqueIndex(...).where(isNull(table.deletedAt))` (partial).
5. Add indexes for FK lookups and common filters.
6. Run `npm run db:generate -- --name <change>` then `npm run db:migrate`.

### Migration history

- `0000_natural_tarot.sql` — initial schema.
- `0001_team-hierarchy-admin-virtual.sql` — `users.isAdmin`, `users.reportsTo`,
  `user_area_assignments`.
- `0002_soft-delete-all-tables.sql` — adds `deleted_at` to all 25 tables and
  converts all 13 unique indexes to partial. **Applied.**
- `0003_password-reset-requests.sql` — adds `password_reset_requests`. **Applied.**

---

## 6. Feature status

### Done

- **Auth**: register (creates org + owner as system Admin), login, logout,
  DB sessions, session cookie, route guard.
- **Forgot password** (`/forgot-password`): 2-step email-temporary-password
  reset, SMTP delivery, per-member monthly limit, session invalidation.
- **Multi-tenancy** scoping on all current queries.
- **Roles & Permissions** (`/settings/roles`): user-defined roles, CRUD,
  permission checklist (assignable modules only), reserved `admin` slug guard,
  cannot delete a role still assigned to members.
- **Organization settings** (`/settings/organization`): profile, currency,
  timezone, logo upload to S3 (with old-logo cleanup), private-file serving via
  `/api/files`.
- **Area management** (`/master-data/areas`): CRUD (soft delete).
- **Team** (`/settings/team`):
  - Tabs: **All**, **Hierarchy**, **Admin**, one tab per role, **Unassigned**.
  - **Hierarchy** tab: recursive indented diagram (member cards → direct reports).
  - **All** tab: members grouped by role, each group in its own table.
  - Search (name/email/code), status filter, pagination, member detail dialog.
  - Create/edit member: role dropdown (Admin shown by default option +
    org roles), reporting line dropdown, multi-area select.
  - Subtree visibility + area-subset enforcement for non-admins.
- **Soft delete** across all tables (schema + migration + actions + reads).
- **Dashboard** (`/dashboard`): member + role counts (soft-delete aware).

### Not built yet (domain tables exist, no UI/actions)

- Products, Outlets, Warehouses, Warehouse stock/movements.
- Sales inventory/stock transactions.
- Orders, Invoices/Finance, Payment methods.
- Routes, Visits (GPS check-in/out), Outlet assignment requests.
- Scheduled tasks runner.

The nav in `app-shell.tsx` only wires Dashboard, Area Management, Organization,
Team, Roles & permissions today.

---

## 7. File map (key files)

```
src/db/
  index.ts                     Drizzle client (postgres-js, global pool in dev)
  schema/_shared.ts            primaryId, timestamps (incl. deletedAt), notDeleted
  schema/*.ts                  per-domain tables; index.ts re-exports all

src/lib/
  auth.ts                      getCurrentUser (cached), isAdmin, can, require*
  permissions.ts               PERMISSIONS, ADMIN_ONLY_PERMISSIONS, Admin constants
  session.ts                   createSession, loadSessionContext, deleteSession, prune
  password.ts                  hash/verify (bcryptjs)
  validation.ts                toFieldErrors (Zod → field errors)
  storage.ts                   S3 client, upload/delete/signed URL helpers
  files.ts                     normalizeFileKey / toFileSrc (private file URLs)
  mailer.ts                    nodemailer SMTP transport + email templates
  utils.ts                     cn()
  actions/
    auth.ts                    login, logout
    onboarding.ts              createOrganization (register)
    organization.ts            updateOrganization (+ logo upload)
    roles.ts                   create/update/delete role
    areas.ts                   create/update/delete area
    account.ts                 create/update/delete member, reset password (hierarchy)
    password-reset.ts          requestPasswordReset, completePasswordReset

src/components/
  app-shell.tsx                sidebar/header, permission-filtered nav
  page-header.tsx, brand.tsx
  ui/*                         shadcn/ui primitives (base-ui + radix)

src/proxy.ts                   optimistic auth guard
```

---

## 8. Patterns to follow

- **Server Actions**: files start with `"use server"`. Actions take
  `(state, formData)` and return `{ ok?, error?, fieldErrors? }`. They
  re-check auth (`getCurrentUser` + `can(...)`) at the top and call
  `revalidatePath(...)` after writes.
- **Form state**: React 19 `useActionState` in client dialogs; field errors are
  produced by `toFieldErrors(zodError)`. For multi-step flows that need to
  branch on the result, call the server action directly from a handler wrapped
  in `useTransition` instead (see the forgot-password form).
- **UI `render` prop**: base-ui components (e.g. `Button`) take
  `render={<Element />}` with the visible children on the **outer** component,
  not inside the render element (see `dialog.tsx`). If the rendered element is
  **not** a native `<button>` (e.g. a `Link`), also pass
  `nativeButton={false}` or Base UI logs a console error about lost button
  semantics.
- **Member mutations** go through `account.ts` and always:
  1. `requireManager()` (needs `team` permission),
  2. validate role belongs to org (Admin handled virtually),
  3. validate reporting line (in-subtree for non-admins, no cycles),
  4. validate areas ⊆ reporting line's areas,
  5. write inside `db.transaction`, then `revalidatePath("/settings/team")`.
- **Reads in pages** are direct Drizzle queries (server components); wrap
  tenant filters with `eq(table.organizationId, organization.id)` **and**
  `notDeleted(table)`.
- **Client URL state** uses `nuqs` (`tab`, `q`, `status`, `page`, `user`, `action`).
- **UI**: compose from `src/components/ui/*`; use `cn()`; icons from
  `lucide-react`.

---

## 9. Gotchas / lessons learned

- **`isNull` is exported from `drizzle-orm`, not `drizzle-orm/pg-core`.**
  In schema files import it as `import { isNull } from "drizzle-orm";`.
- When adding a `where`/`and` condition, make sure `and` is imported from
  `drizzle-orm` in that file (several bugs from this).
- Keep `asc`/`desc` imports when editing `orderBy` lines.
- `sessions` does **not** use the shared `timestamps`, so its `deletedAt` is
  declared inline — don't forget it when touching that table.
- The `_journal.json` `when` timestamps must stay consistent; if you need to
  regenerate a migration, delete the `.sql` + snapshot and revert the journal
  entry first, then re-run `db:generate`.
- `AGENTS.md` (nextjs-agent-rules block) is auto-managed by `next dev`; leave it
  intact in commits.
- **`SMTP_FROM` must use a sender domain authorized for the SMTP account.** The
  relay rejects an unlinked custom domain with
  `450 Relay failed: Custom sender domain missing auth credentials` — it is a
  config problem, not code. Currently `dev-no-reply@mail.hisea.id`.
- **Never let an unhandled promise rejection reach the page.** Wrap outbound
  email sends in the action and return an error state; a throwing server action
  surfaces as a Next.js runtime error on the page.
- Git history so far: `64ff094 first commit` → setup, area mgmt, S3, org,
  admin lockdown, reporting line, soft delete.

---

## 10. Suggested next steps

1. **Products / Outlets / Warehouses** CRUD pages + actions (follow the areas
   pattern: partial unique indexes, soft delete, org scoping).
2. **Orders + line items** flow, then **Invoices/Finance** and **Payment methods**.
3. **Routes & Visits** (route planning UI, GPS check-in/out, stock checks).
4. **Stock movement / sales stock** screens and inventory aggregation.
5. **Scheduled tasks** runner for heartbeats/reminders.
6. Add a nav entry per new module in `app-shell.tsx` guarded by its permission key.

When adding any new table or delete/read path, remember the two project-wide
rules: **soft delete everywhere**, and **scope every query by organization**.
