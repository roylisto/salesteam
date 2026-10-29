# Salesteam — Agent Journal

> Handoff notes for AI agents doing "vibe coding" on this repo.
> Read this first; it captures the project context, conventions, and what has
> already been built so you can continue without re-discovering everything.
> Last updated: 2026-10-29 (**Team org structure**) — renamed the team tab "Hierarki" to **Struktur Organisasi** and made the recursive tree node cards expand/collapse (chevron toggle) so the page is not long; roots start expanded, deeper levels start collapsed.
>
> Previous: 2026-10-29 (**Searchable option fields (Combobox) — all dropdowns**) — added `src/components/ui/combobox.tsx`, a searchable single-select built on Base UI `Combobox`, and swapped **every** `Select` dropdown across the app for it (warehouse form, outlet form, organization form, shared `location-picker` wilayah selects, plus the area/warehouse/status list filters and team member dialog selects) so long lists can be filtered by typing. `ui/select.tsx` is kept but no longer used in feature code.
>
> Previous: 2026-10-29 (**Searchable option fields (Combobox) — warehouse form**) — introduced `ui/combobox.tsx` and converted every option field on the warehouse form (Area, PIC, Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan) from `Select` to it.
>
> Previous: 2026-10-28 (**Robust Address Sync Engine**) — implemented a `pendingSync` queue mechanism to handle the asynchronous nature of cascading address dropdowns. Map results are now queued and processed as each level of the Wilayah API loads, preventing race conditions and ensuring that choices like Palembang or other regions sync correctly. Also improved OSM parsing to ignore numeric noise (like "03") and added automatic cleanup if a map result has no corresponding entry in the official dropdown.
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

`.env.example` is committed (un-ignored via `!.env.example` in `.gitignore`);
copy it to `.env` and fill in real values. `.env` itself stays gitignored.
`storage.ts` **throws at startup** if any `S3_*` var is empty, so those must be
set for the app to boot.

**DB TLS:** the database is managed Postgres (Aiven) that requires a verified
TLS connection. The project CA is supplied **as a PEM string in `DB_SSL_CA`**
(no cert file in the repo). Both
[db/index.ts](file:///Users/roy/Projects/salesteam/src/db/index.ts) and
`drizzle.config.ts` read `DB_SSL_CA` (normalising literal `\n` → newline) and
connect with `ssl: { ca, rejectUnauthorized: true }`. `DATABASE_URL` keeps
`?sslmode=require`, but the explicit `ssl` option wins over the URL query
(postgres-js resolves options before params). `drizzle.config.ts` therefore
parses `DATABASE_URL` into discrete credentials (its `url` form can't take a
CA).

| Var                                         | Purpose                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                              | Postgres connection string (required)                |
| `DB_POOL_SIZE`                              | Connection pool size (default 10)                    |
| `DB_SSL_CA`                                 | DB CA cert (PEM) for TLS verification (required)     |
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
  (auth)/change-password        → forced change for system-generated passwords
                                  (requires session; NOT in proxy PUBLIC_ROUTES)
  (app)/layout.tsx              → requires user, renders <AppShell>
  (app)/dashboard               → dashboard
  (app)/master-data/areas       → area management
  (app)/master-data/warehouses       → warehouse list
  (app)/master-data/warehouses/new   → create warehouse (full-page form)
  (app)/master-data/warehouses/[id]  → edit warehouse (full-page form)
  (app)/master-data/outlets     → outlet management (customer stores)
  (app)/master-data/outlets/new      → create outlet (full-page form)
  (app)/master-data/outlets/[id]     → edit outlet (full-page form)
  (app)/master-data/outlet-types     → outlet type master data (sales channels)
  (app)/settings/organization   → org settings (logo upload, currency, tz)
  (app)/settings/team           → team hierarchy + members
  (app)/settings/roles          → user-defined roles & permissions
  (app)/profile                 → own account details + change own password
  api/files/[...key]/route.ts   → authenticated S3 object streaming
```

- **`src/proxy.ts`** is the optimistic edge guard. It only checks that the
  session cookie exists; the authoritative check is in the DAL. Public routes:
  `/`, `/login`, `/register`, `/forgot-password`. Unauthenticated → redirect to
  `/login?next=...`; authenticated hitting a public route → redirect to `/dashboard`.
- **`src/components/app-shell.tsx`** renders the sidebar/header and filters nav
  items by the user's permission keys. The sidebar uses the `--sidebar-*` theme
  tokens (see §4.10), giving it a solid deep-indigo surface with light content;
  nav links use `text-sidebar-foreground`, `hover:bg-sidebar-accent` and
  `bg-sidebar-primary` for the active item. The mobile sheet reuses the same
  tokens so it matches the desktop rail. **Sidebar is collapsible** (toggle button
  in header, state persisted in `localStorage.sidebarCollapsed`): collapsed
  width is `w-16` showing icons only with tooltip labels; expanded width is
  `w-64` showing full labels. Smooth 200ms transition.

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
  `outlets`, `outlet_types`, `warehouses`, `warehouse_movements`, `sales_inventory`,
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
- **Warehouse assignment (area-first):** `user_warehouse_assignments` maps a
  user to multiple `warehouses` (org-scoped). A member can cover many
  warehouses, but each must belong to one of the member's **selected areas** —
  the UI shows a warehouse checklist grouped/separated by area and only for
  areas that are currently ticked; picking an area is a prerequisite.
  `warehousesWithinAreas()` in `account.ts` re-validates this server-side
  (rejects warehouses outside the selected areas). Deselecting an area also
  drops its warehouses in the dialog.
- Cycle guards prevent circular reporting lines (`wouldCreateCycle`).
- `deleteMember` soft-deletes the user, re-points direct reports to the deleted
  member's own manager (so the tree doesn't dangle), and soft-deletes their
  area **and warehouse** assignments.
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

**Expiry rules (important):** only the _forgot-password_ temporary password
expires (60 min, stored hashed in `password_reset_requests`). The password
issued when an admin **adds a team member** is generated by the system
(`generateTemporaryPassword()` in `password.ts`) and **does not expire** — it
simply becomes that member's password until they change it themselves via the
forgot-password flow.

### 4.7 Member creation credentials (system-generated password)

When adding a team member the admin **never types a password**:

1. `createMember` generates a 12-char random password (`node:crypto`
   `randomInt`, unambiguous alphabet — no `0/O/1/l/I`) and hashes it before the
   transaction. `CreateMemberSchema` has no `password` field.
2. After the transaction succeeds, exactly **one** email is sent via
   `sendMemberCredentialsEmail()` in `mailer.ts` (SMTP quota conservation —
   never send more than one message per creation). Failure is caught: the
   member is kept, `emailSent: false` is returned, and the error is logged.
3. The action returns `{ ok, temporaryPassword, emailSent }`. The create
   dialog does **not** close on success — it swaps to a credentials screen
   showing the password with a Copy button, so the admin can share it manually
   if the email failed.

### 4.8 Forced password change on first login (`users.mustChangePassword`)

- `users.must_change_password` (boolean, default false) — set to **true** in
  `createMember`. It means "still on the system-generated password".
- **Enforcement:** `(app)/layout.tsx` redirects to `/change-password` when the
  flag is set, so every in-app page is blocked until the member picks their own
  password. The page itself lives in the `(auth)` group (outside `(app)`) to
  avoid a redirect loop and redirects to `/dashboard` when the flag is already
  clear (or `/login?next=/change-password` when signed out).
- **Clearing the flag:** the `changePassword` action (in
  `actions/auth.ts` — verifies current password, min 8, confirm match) and
  `completePasswordReset` (forgot-password step 2).
- The change-password form includes a **Sign out** escape hatch (calls
  `logout()`), because a signed-in user is otherwise stuck: the proxy would
  bounce them off `/login` back to the dashboard. After signing out they can
  use the forgot-password flow (flag gets cleared there too).

### 4.9 Profile page & who may change a password

- **`/profile`** (in the `(app)` group, link lives in the header **user menu** —
  not the permission-gated sidebar) shows the signed-in user's read-only
  account details (name, email, username, role, staff code, organization) plus a
  **Change password** card. It reuses the same `changePassword` action as the
  forced first-login page (`actions/auth.ts`) → verifies current password,
  min 8 chars, confirm match, then clears `mustChangePassword`.
- **Changing your own password** is always allowed (profile page).
- **Changing someone else's password is Admin-only.** The "Reset password"
  block in the team member detail dialog is rendered only when
  `canResetPassword = actorIsAdmin && member.id !== currentUserId`, and
  `resetMemberPassword` (`account.ts`) re-checks `isAdmin(manager)` server-side
  and returns `"Only an Admin can reset another member's password."` otherwise.
  Non-admin managers get the (empty) UI hidden and a rejection if they call the
  action directly.

### 4.10 Theme & the coloured sidebar

- Theme tokens live in `src/app/globals.css` (`:root` light, `.dark` dark); the
  rest of the app is a neutral, all-white surface.
- The **sidebar is coloured** (flat, no gradient) via the `--sidebar-*` tokens:
  a solid **deep indigo** surface (`--sidebar`), light foreground
  (`--sidebar-foreground`), a translucent-white hover/active wash
  (`--sidebar-accent`), and a vivid indigo active pill (`--sidebar-primary`).
- `app-shell.tsx` therefore uses the sidebar tokens (not the global
  `accent`/`muted`) inside the rail — desktop `aside`, `SidebarContent` and the
  mobile `SheetContent` — so text/icons stay legible against the dark surface.
- The **header** stays on the light `background` tokens, which keeps the top bar
  contrasting with the coloured rail.

---

## 5. Database schema (tables)

Defined in `src/db/schema/*` and re-exported from `index.ts`.

- **organizations.ts** — `organizations` (tenant root: name, slug, legalName,
  email, phone, address, logoUrl, currency, timezone).
- **auth.ts** — `roles` (per-org, `permissions` jsonb), `users` (roleId,
  reportsTo, code, name, email, passwordHash, phone, avatarUrl, isActive,
  mustChangePassword, isAdmin, isOrganizationOwner, lastLoginAt), `sessions` (id, userId, expiresAt,
  ip, userAgent, deletedAt), `password_reset_requests` (userId, tokenHash,
  expiresAt, usedAt, timestamps — backing the forgot-password flow + monthly limit).
- **master-data.ts** — `area_offices`, `user_area_assignments`, `warehouses`,
  `user_warehouse_assignments`, `outlet_types` (per-org sales-channel master
  data: name + isActive), `products`, `outlets` (references `outlet_type_id` →
  `outlet_types`; optional `warehouse_id` + `sales_id`; address parts, lat/lng,
  owner/contact, KYC ids, `image_url`), `warehouse_stocks`.
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
- `0004_users-must-change-password.sql` — adds `users.must_change_password`
  (forced first-login password change). **Applied.**
- `0005_user-warehouse-assignments.sql` — adds `user_warehouse_assignments`
  (member → warehouse, area-first). **Applied.**
- `0006_far_ben_urich.sql` — adds the `outlet_types` table and rewires `outlets`
  from the old free-text `outlet_type` column to `outlet_type_id` (FK →
  `outlet_types`, `ON DELETE SET NULL`) with a partial unique index on
  `(organization_id, name)`. **Applied.**
- `0007_dry_randall.sql` — drops the legacy `outlets.outlet_type` varchar
  column. **Applied.**
- `0008_keen_redwing.sql` — adds `users.username` (varchar(50), nullable) plus
  the partial unique index `users_username_unique` (global — usernames are
  unique across all tenants because login is global). **Applied.**
- `0009_richard_goldstein.sql` — adds `users.user_type` enum (`back_office`,
  `sales`, default `back_office`) for team member type separation. **Applied.**
- `0010_public_the_professor.sql` — adds warehouse detail columns:
  `pic_user_id` (FK → users, set null), `address`, `province`, `regency`,
  `district`, `village`, `postal_code`, `latitude` (double precision),
  `longitude` (double precision); plus `warehouses_pic_user_idx`. **Applied.**
- All of `0000`–`0010` were applied to the Aiven dev database
  (`pg-salesteam-dev-…aivencloud.com`, CA supplied via `DB_SSL_CA`) on
  2026-10-27 — verified 28 tables in `public`.

---

## 6. Feature status

### Done

- **Auth**: register (creates org + owner as system Admin), login, logout,
  DB sessions, session cookie, route guard. **Login accepts either the member's
  email or their (optional) username** — `users.username` is a global, optional,
  lowercased handle; the login form posts a single `identifier` field matched
  against `users.email OR users.username`.
- **Username**: optional login handle on `users` (validated by
  `optionalUsername` in `src/lib/validation.ts`: 3–50 chars, lowercase letters,
  digits, `.`, `_`, `-`). Editable when creating/updating a member, set during
  owner onboarding, shown on the profile page and quoted in the new-member
  credentials email.
- **Forced first-login password change**: members added by an admin are bounced
  to `/change-password` on every app page until they replace the
  system-generated password.
- **Profile** (`/profile`, linked from the header user menu): own account
  details + **change own password**. Resetting _another_ member's password is
  Admin-only (see §4.9).
- **Forgot password** (`/forgot-password`): 2-step email-temporary-password
  reset, SMTP delivery, per-member monthly limit, session invalidation.
- **Multi-tenancy** scoping on all current queries.
- **Roles & Permissions** (`/settings/roles`): user-defined roles, CRUD,
  permission checklist (assignable modules only), reserved `admin` slug guard,
  cannot delete a role still assigned to members.
- **Organization settings** (`/settings/organization`): profile, currency,
  timezone, logo upload to S3 (with old-logo cleanup), private-file serving via
  `/api/files`. Currency, timezone and the wilayah fields are searchable
  `Combobox`es.
- **Area management** (`/master-data/areas`): CRUD (soft delete).
- **Warehouse management** (`/master-data/warehouses`): **full create/edit pages**
  (`/new`, `/[id]`) instead of a dialog. Fields: name, depot type, active flag,
  area (dropdown), **PIC** (dropdown of Back Office users only), **address parts**
  (address, province/regency/district/village cascading dropdowns from
  `api.kodewilayah.web.id`, postal code), **latitude/longitude picked on an
  OpenStreetMap (Leaflet) map** (search via Nominatim + "my location" + click/drag
  pin). List has search (name) + area filter + pagination. Gated by the
  `warehouses` permission. All queries scoped by org + soft-delete aware;
  assignments validated to belong to the org. **Every option field on the form
  (Area, PIC, Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan) is a searchable
  `Combobox`** (`ui/combobox.tsx`) — type to filter instead of scrolling.
- **Outlet management** (`/master-data/outlets`): CRUD (soft delete) for
  customer stores, using **full create/edit pages** (`/new`, `/[id]`) instead of
  a dialog. Fields: name + per-org unique optional `code`, `status`
  active/inactive, optional `warehouseId` + `salesId` (active member) +
  `outletTypeId` (dropdown from `outlet_types`), storefront **photo upload to
  S3**, address parts (address, addressDetail, village/district/city/province/
  country/postalCode), **latitude/longitude picked on an OpenStreetMap (Leaflet)
  map** (search via Nominatim + "my location"), owner/contact (ownerName,
  ownerAddress, phone, email) and KYC/legal ids (nationalId, familyCardNumber,
  taxId, businessId) + notes. List has search (name/code) + warehouse filter
  (incl. "No warehouse") + status filter + pagination, and links into the pages.
  All dropdowns (type, warehouse, sales, wilayah) are searchable `Combobox`es,
  as are the list's warehouse/status filters.
  Gated by the `outlets` permission. All queries scoped by org + soft-delete
  aware; assignments validated to belong to the org.
- **Outlet types** (`/master-data/outlet-types`): CRUD (soft delete) master data
  for sales channels (Retail, Grosir, Horeca, …) — name + isActive, per-org
  partial-unique name. Gated by the `outlet_types` permission. Feeds the outlet
  form's type dropdown.
- **Team** (`/settings/team`):
  - Tabs: **Semua**, **Struktur Organisasi**, **Back Office**, **Sales**.
  - **Struktur Organisasi** tab: recursive indented diagram (member cards →
    direct reports). Each node with subordinates is expand/collapse (chevron);
    root members start expanded and deeper levels start collapsed so the page
    stays compact.
  - **All** tab: members grouped by role, each group in its own table.
  - Search (name/email/code), status filter, pagination, member detail dialog.
  - Create/edit member: role dropdown (Admin shown by default option +
    org roles), reporting line dropdown, multi-area select. The user-type, role
    and reporting-line dropdowns, plus the list's status filter, are searchable
    `Combobox`es.
  - **Warehouse assignment (area-first)**: after picking areas, a warehouse
    checklist appears grouped/separated by area (only for the selected areas).
    A member can hold multiple warehouses across multiple areas; deselecting an
    area removes its warehouses. Persisted in `user_warehouse_assignments` and
    validated server-side (warehouses must fall within the selected areas).
  - **Admin (system) role option is Admin-only**: `RoleSelect` renders it only
    when the actor is an Admin (or the member already holds it), and the create
    dialog only pre-selects it for an Admin actor. Server-side
    `createMember`/`updateMember` also reject a non-admin trying to grant it
    ("Only an Admin can grant the Admin role.").
  - **Add member**: no manual password field — the system generates the
    password, emails it once to the new member (non-expiring), and shows it on
    a credentials screen with a copy button (fallback if the email fails).
  - **Reset password**: Admin-only — non-admin managers never see the control
    (server action also rejects them). Members change their own from `/profile`.
  - Subtree visibility + area-subset enforcement for non-admins.
- **Soft delete** across all tables (schema + migration + actions + reads).
- **Dashboard** (`/dashboard`): member + role counts (soft-delete aware).

### Not built yet (domain tables exist, no UI/actions)

- Products, Warehouse stock/movements.
- Sales inventory/stock transactions.
- Orders, Invoices/Finance, Payment methods.
- Routes, Visits (GPS check-in/out), Outlet assignment requests.
- Scheduled tasks runner.

The nav in `app-shell.tsx` only wires Dashboard, Area Management, Warehouses,
Outlets, Organization, Team, Roles & permissions today.

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
  password.ts                  hash/verify (bcryptjs), generateTemporaryPassword
  validation.ts                toFieldErrors (Zod → field errors)
  storage.ts                   S3 client, upload/delete/signed URL helpers
  files.ts                     normalizeFileKey / toFileSrc (private file URLs)
  mailer.ts                    nodemailer SMTP transport; sendTemporaryPasswordEmail
                               (forgot password, expires) + sendMemberCredentialsEmail
                               (new member login details, no expiry)
  utils.ts                     cn()
  actions/
    auth.ts                    login, logout, changePassword (forced first login
                               + profile page)
    onboarding.ts              createOrganization (register)
    organization.ts            updateOrganization (+ logo upload)
    roles.ts                   create/update/delete role
    areas.ts                   create/update/delete area
    warehouses.ts              create/update/delete warehouse (area-scoped)
    outlets.ts                 create/update/delete outlet (warehouse + rep +
                               outlet-type assignment, per-org unique code,
                               full address/geo/KYC fields, S3 photo upload)
    outlet-types.ts            create/update/delete outlet type (per-org name)
    account.ts                 create/update/delete member (system-generated pw
                               + one credentials email), reset password
                               (Admin-only for other members)
    password-reset.ts          requestPasswordReset, completePasswordReset

src/app/(app)/profile/
  page.tsx                     own account details (server component)
  profile-form.tsx             read-only details + change-own-password form

src/app/(app)/master-data/warehouses/
  page.tsx                     warehouse list (joins area name)
  warehouses-client.tsx        search + area filter + paginated table
  new/page.tsx                 create warehouse page (server: loads options)
  [id]/page.tsx                edit warehouse page (server: loads warehouse + options)
  warehouse-form.tsx           shared full-page form (cards, PIC, wilayah, map)
  data.ts                      loadFormOptions + loadWarehouseDetail helpers
  types.ts                     WarehouseRow, WarehouseDetail, *Option types

src/app/(app)/master-data/outlets/
  page.tsx                     outlet list (joins warehouse + rep + type names)
  outlets-client.tsx           search + warehouse/status filters + table (links)
  new/page.tsx                 create outlet page (server: loads options)
  [id]/page.tsx                edit outlet page (server: loads outlet + options)
  outlet-form.tsx              shared full-page form (cards, photo, map, KYC)
  location-picker.tsx          OpenStreetMap/Leaflet lat-lng picker (search)
  data.ts                      loadFormOptions + loadOutletDetail helpers
  types.ts                     OutletRow, OutletDetail, *Option types

src/app/(app)/master-data/outlet-types/
  page.tsx                     outlet type list (server component)
  outlet-types-client.tsx      search + paginated table + dialog opener
  outlet-type-dialog.tsx       create/edit/delete dialog (name + active)
  types.ts                     OutletTypeRow

src/components/
  app-shell.tsx                sidebar/header, permission-filtered nav
  page-header.tsx, brand.tsx
  location-picker.tsx          shared OpenStreetMap/Leaflet lat-lng picker (used by Outlets & Warehouses)
  use-wilayah-cascade.ts       province→village cascading state + map (OSM) sync
  ui/*                         shadcn/ui primitives (base-ui + radix)
  ui/combobox.tsx              searchable single-select (Base UI Combobox); now used
                               for all feature dropdowns in place of `ui/select`

src/proxy.ts                   optimistic auth guard
```

---

## 8. Patterns to follow

- **Bahasa Indonesia (UI language)**: the app is for Indonesia, so **all
  user-facing copy is Indonesian** — labels, buttons, tables, placeholders,
  `aria-label`, `sr-only`, `metadata` titles/descriptions, toasts, Zod messages
  in server actions, and email content (`mailer.ts`). The root `<html lang="id">`.
  **Keep code as English**: identifiers, object keys, DB values (e.g. `"active"`),
  permission keys, route paths, and code comments. Formal tone, address the user
  as "Anda". Spring-cleaning glossary used: Gudang, Outlet, Tipe Outlet, Area,
  Organisasi, Tim, Peran, Izin, Pengaturan, Data Induk, Dasbor, Simpan, Ubah,
  Hapus, Batal, Kembali, Cari, Aktif/Tidak aktif, Belum ditugaskan.
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
  4. validate areas ⊆ reporting line's areas, and warehouses ⊆ selected areas,
  5. write inside `db.transaction`, then `revalidatePath("/settings/team")`.
- **Reads in pages** are direct Drizzle queries (server components); wrap
  tenant filters with `eq(table.organizationId, organization.id)` **and**
  `notDeleted(table)`.
- **Client URL state** uses `nuqs` (`tab`, `q`, `status`, `page`, `user`, `action`).
- **UI**: compose from `src/components/ui/*`; use `cn()`; icons from
  `lucide-react`.
- **Searchable dropdowns**: use `ui/combobox.tsx` (`Combobox`) instead of
  `ui/select.tsx` for feature dropdowns — all forms and filters now use it
  (long lists like wilayah, PIC, outlets, and short ones like status/user type).
  Its `options` are `{ value, label }` objects — build them with `useMemo` so the
  array identity stays stable across keystrokes (Base UI matches items by
  `Object.is`), and drive selection with `value: string` +
  `onValueChange: (value: string) => void`. Use `""` for an empty/"none" option.
  `autoHighlight` is set so Enter picks the best match instead of submitting the
  surrounding `<form>`.

---

## 9. Gotchas / lessons learned

- **DB TLS CA lives in `DB_SSL_CA`** (a PEM string in `.env`), not a file. In
  `.env` it's a quoted multi-line value; in single-line deploy envs use literal
  `\n` escapes — the code normalises both.
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
- **Leaflet is client-only.** `location-picker.tsx` imports `leaflet` lazily
  inside a `useEffect` (never at module top-level) so SSR never touches
  `window`. Leaflet's default marker images break under bundlers — use
  `L.divIcon` for the pin. Coordinates are surfaced as strings and echoed into
  the form via hidden state (not a real input).
- **Collapsible sidebar**: state is read from `localStorage` on mount (with
  `typeof window` guard to avoid SSR mismatch) and written on change. The
  `SidebarContent` component receives `collapsed` prop and conditionally hides
  labels + shortens section headers; `NavLinks` uses `justify-center` +
  `title` tooltip when collapsed.
- **Don't write a ref during render** (`ref.current = x` at the top of a
  component) — the `react-hooks/refs` lint rule errors. Mirror callbacks into a
  ref inside a `useEffect` instead (see `location-picker.tsx`).
- **Only one `<form>` per page.** The outlet form is a big `<form>`, so the
  map picker's search box must **not** be its own `<form>` (nested forms →
  hydration error). It uses a plain `<div>` + buttons and handles Enter via
  `onKeyDown`. Never render a `<form>` inside another `<form>`.
- **`Button render={<Link />}` also needs `nativeButton={false}`**, otherwise
  Base UI logs "expected a native `<button>`" (see §8).
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
