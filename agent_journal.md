# Salesteam — Agent Journal

> Handoff notes for AI agents doing "vibe coding" on this repo.
> Read this first; it captures the project context, conventions, and what has
> already been built so you can continue without re-discovering everything.
> Last updated: 2026-11-09 (**Product catalogue and sale pricing**) — Manajemen Produk includes Brand, Tipe Produk, Satuan, Daftar Produk and Harga Jual, each with tenant-scoped server pagination/search and audit history. New or updated SKUs require a brand, type, photo and base unit; alternative sale units have per-SKU decimal conversion factors. Unit definitions flag whether fractional quantities are allowed. Sale prices are unique per product sale unit, outlet type and scope. Effective price previews use the warehouse assigned to the outlet and resolve Warehouse → its Area → Global for the same outlet type and unit. Product deletion soft-deletes sale units and prices, and referenced master records cannot be deleted while in use. Legacy product columns were retained. No inventory or order UI was added. Migration `0023_product-catalog-and-pricing` applied.
>
> Previous: 2026-11-09 (**Server-side table queries**) — Area, Gudang, Tipe Gudang, Outlet, Tipe Outlet, Tim and audit-history tables now page, search, filter and sort in PostgreSQL where applicable. Peran cards also use server search/paging. Shared page sizes are 10/20/30/40/50, default 20, and query changes reset to the first page. Tim preserves reporting scope through a recursive SQL query; its separate hierarchy view still loads the tree. Audit history has its own URL keys for search, action and paging. Dialog links can load a selected row outside the current page. No migration.
>
> Previous: 2026-11-09 (**Outlet GIS zoom hierarchy**) — after Tampilkan Outlet, the map uses OSM basemap tiles with transparent BIG administrative boundary overlays. Zoom 0–6 shows full filtered province totals (including outlets with a province but no coordinates), 7–9 regency/city, 10–12 district, 13–14 village, and 15+ pins with the existing dense-view fallback. Lower levels use the visible viewport. Province totals and boundary image reuse a fixed national view request; finer boundary requests contain only public viewport coordinates. The province list shows totals even when a province has no point to place on the map.
>
> Previous: 2026-11-09 (**Outlet overview map**) — `/master-data/outlets?tab=map` loads only filter options until **Tampilkan Outlet** is clicked. Area filters warehouse choices, and the API applies organization, permission, soft-delete, viewport, area, warehouse and type constraints. PostgreSQL returns district counts below zoom 11, village counts at zoom 11–14, then type-colored pins from zoom 15. More than 750 visible outlets at pin zoom falls back to village counts. Count badges render on a canvas, and pins use React portals. Migration `0022_outlet-map-index` adds a partial coordinate index and was applied. Integration checks covered zoom levels, filters, tenant isolation, permission checks, and dense fallback inside a rolled-back transaction.
>
> Previous: 2026-11-09 (**Audit trail**) — one `audit_logs` table stores actor name snapshot, module, action, target, and time. CRUD actions log in the same transaction as their mutations. Organization onboarding and successful sign-in, sign-out, password changes and password resets are included. Each CRUD menu and Profile has a server-paginated **Riwayat Aktivitas** tab. Reads enforce tenant and module permissions, profile is self-only, and non-admin Team history is scoped to own actions and the visible reporting subtree. No passwords, tokens, or raw form payloads are logged. Migration `0021_audit-logs` applied.
>
> Previous: 2026-11-09 (**Soft-delete coverage**) — migration `0020_wilayah-soft-delete` adds `wilayah.deleted_at`; region lookups exclude retired rows. The importer stages the source in a transaction, restores current codes, and retires missing codes without deleting them. Outlet photos and organization logos are detached when removed or replaced, with old objects retained in private storage.
>
> Previous: 2026-11-09 (**Server-paginated outlet list and thumbnails**) — outlet list uses URL-backed server search, filters, sorting and 10 rows per page. Its existing authenticated file route supports outlet-only 96×96 WebP thumbnails using Sharp with a private browser cache. The original file is used for edit, and the list falls back to the outlet type icon if the thumbnail is unavailable.
>
> Previous: 2026-11-09 (**Outlet PIC removed**) — outlet master data no longer assigns Sales PIC. Removed the field and its validation from create/edit, detail queries, and the list. Sales assignment is reserved for routing. The **Outlet aktif** switch uses a compact inline control. Migration `0019_remove-outlet-sales-pic` applied and removed the legacy column, index, and FK.
>
> Previous: 2026-11-09 (**Outlet PIC by warehouse**) — create/edit filters eligible active Sales users by the selected warehouse using non-deleted `user_warehouse_assignments`. Changing warehouse clears the PIC if no longer eligible. Server validates the same warehouse assignment and organization on save.
>
> Previous: 2026-11-09 (**Required outlet details and upload limit**) — outlet create/edit requires name, outlet type, warehouse and active Sales PIC. Validation runs in the form and server actions. The form keeps entered values when a save is rejected. The Next.js Server Actions request limit is 3 MB to fit the existing 2 MB image allowance plus multipart fields.
>
> Previous: 2026-11-09 (**Outlet area filter and Sales PIC**) — outlet create/edit first selects a warehouse area, which filters warehouse options. Edit derives the area from the existing warehouse, including an option for legacy warehouses without an area. Changing area clears the warehouse selection and locks the shop address and map until a warehouse is selected again. PIC choices and server validation allow only active Sales users from the same organization.
>
> Previous: 2026-11-09 (**Outlet warehouse-first location**) — create/edit requires a non-deleted warehouse from the same organization. The selected warehouse coordinates provide the outlet map’s initial pin only; saved or user-selected outlet coordinates take priority and only those are persisted. Legacy outlets without a warehouse require assignment on the next save. The form no longer geocodes the organization’s region as the starting point.
>
> Previous: 2026-11-09 (**More type icons**) — both outlet and warehouse type dialogs now offer 18 icon choices in a wrapping icon-only layout. Each option retains a tooltip, accessible name, and selected state. New icon keys use the existing validation and rendering maps, including the warehouse map. No schema change.
>
> Previous: 2026-11-07 (**Outlet navigation and type appearance; tab hover fix**) — sidebar groups **Manajemen Outlet** into **Daftar Outlet** and **Tipe Outlet**, using the same permission-aware expandable group / collapsed dropdown as warehouses. Outlet types now save `color` (hex) and allowlisted `icon`, with eight color presets, custom color, six retail/business icons and live preview. Both type and outlet lists display the saved symbol; existing types default to indigo/store. Shared configuration/rendering: `src/lib/outlet-appearance.ts`, `src/components/outlet-type-symbol.tsx`. Migration `0018_outlet-type-appearance` applied. Warehouse active tabs explicitly retain white text on hover in light/dark themes.
>
> Previous: 2026-11-07 (**Map pin React lifecycle fix and active tabs**) — warehouse map pin icons now render through React portals owned by the map component instead of independent `createRoot` roots. Cleanup only disposes Leaflet/ResizeObserver; React handles portal unmounting, avoiding the synchronous-root-unmount warning when switching tabs or rebuilding markers. Active warehouse list/map tabs use the primary color and contrasting foreground in light/dark themes.
>
> Previous: 2026-11-07 (**New warehouse location default**) — new warehouse pages load Head Office coordinates directly from the signed-in organization and initialize the form/map pin at that position. Works when opening `/master-data/warehouses/new` directly. Valid Head Office coordinates take precedence over province/city geocoding; when unavailable, the existing region-based fallback remains. Edit pages retain their warehouse coordinates.
>
> Previous: 2026-11-07 (**Warehouse overview map**) — warehouse list icons now use each type’s saved color/icon. `/master-data/warehouses` has URL-backed **Daftar Gudang** / **Peta Gudang** tabs (`tab=list|map`). The lazy client-only Leaflet overview renders all filtered warehouses (not only the current table page), colored icon pins, safe DOM-built detail popups with edit links, type legend, fit-to-all control, responsive sizing, and missing-coordinate notices. A distinct **Kantor Pusat (Head Office)** pin uses the organization’s saved coordinates/address and remains visible regardless of warehouse filters. Type/area/PIC joins now enforce organization and soft-delete filters. No new schema or migration.
>
> Previous: 2026-11-07 (**Warehouse type appearance**) — warehouse types now store a hex `color` and an allowlisted `icon` key. Create/edit dialogs offer eight color presets, a custom color picker, six warehouse/logistics icons, and a live symbol preview. The type list displays the saved colored symbol. Existing types default to indigo (`#4f46e5`) and `warehouse`. Shared keys/palette live in `src/lib/warehouse-appearance.ts`; rendering and icon labels live in `src/components/warehouse-type-symbol.tsx`, ready for future warehouse map markers. Server actions validate both fields. Migration `0017_warehouse-type-appearance` applied successfully. TypeScript and targeted ESLint passed. The overall warehouse map remains future work.
>
> Previous: 2026-11-07 (**Warehouse navigation**) — grouped warehouse links under **Manajemen Gudang** with **Daftar Gudang** and **Tipe Gudang** submenus. Expanded desktop/mobile navigation uses a collapsible group; collapsed sidebar uses a dropdown. Each child retains its own permission filter, and the parent is hidden when neither child is accessible.
>
> Previous: 2026-10-29 (**Warehouse types master data**) — added the `warehouse_types` master-data table (per-org name + isActive, soft delete) with its own `/master-data/warehouse-types` page (search + sort + dialog CRUD, `warehouse_types` permission) and a **Tipe Gudang** sidebar entry. `warehouses.depot_type` (free text) was replaced by `warehouses.warehouse_type_id` (FK → `warehouse_types`, `ON DELETE SET NULL`), and the warehouse form's "Tipe Gudang" is now a searchable `Combobox` fed by the master data instead of a text input. Migrations `0015_warehouse-types` + `0016_warehouse-drop-depot-type` (both applied).
>
> Previous: 2026-10-29 (**Team member pages**) — adding **and** editing a team member are now full pages (`/settings/team/new`, `/settings/team/[id]`) instead of dialogs; the team table list shows the **Kode pegawai** column, and rows (plus org-tree nodes) link to the edit page. Shared member form fields live in `member-fields.tsx`; team data loading is in `data.ts` (used by the list, new, and edit pages). Both forms share the same compact 2-column layout (no card header, `lg:grid-cols-2`): **personal data on the left**, **Area & Gudang on the right**.
>
> Previous: 2026-10-29 (**Sortable table columns**) — added `src/components/table-sort.tsx` (`useTableSort` + `SortableHead`) and wired click-to-sort headers (with asc/desc icons + `aria-sort`) into every data table: Areas, Outlet types, Warehouses, Outlets, and the Team `MemberTable`. The active column/direction live in the URL (`sort`, `dir`).
>
> Previous: 2026-10-29 (**Team org structure**) — renamed the team tab "Hierarki" to **Struktur Organisasi** and made the recursive tree node cards expand/collapse (chevron toggle) so the page is not long; roots start expanded, deeper levels start collapsed.
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
  (app)/master-data/warehouse-types  → warehouse type master data
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
  `outlets`, `outlet_types`, `warehouses`, `warehouse_types`, `warehouse_movements`,
  `sales_inventory`, `sales_stock`, `orders`, `visits`, `finance`, `payments`,
  `areas`, `organization`, `team`, `roles`.
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
  block on the member edit page (`/settings/team/[id]`) is rendered only when
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
- **master-data.ts** — `area_offices`, `user_area_assignments`, `warehouse_types`
  (per-org warehouse-type master data: name + isActive), `warehouses` (references
  `warehouse_type_id` → `warehouse_types`; optional `pic_user_id`, area,
  address parts, lat/lng), `user_warehouse_assignments`, `outlet_types` (per-org
  sales-channel master data: name + isActive), `products`, `outlets` (references
  `outlet_type_id` → `outlet_types`; optional `warehouse_id` + `sales_id`; address
  parts, lat/lng, owner/contact, KYC ids, `image_url`), `warehouse_stocks`.
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

- `0023_product-catalog-and-pricing.sql` — adds catalogue reference, sale unit and price tables and product reference fields. **Applied.**

- `0022_outlet-map-index.sql` — indexes live outlet coordinates by organization for viewport queries. **Applied.**

- `0021_audit-logs.sql` — adds one audit trail table and an organization/module ordering index. **Applied.**

- `0020_wilayah-soft-delete.sql` — adds nullable `wilayah.deleted_at`. **Applied.**

- `0019_remove-outlet-sales-pic.sql` — drops the outlet Sales PIC column and its index and foreign key. **Applied.**

- `0018_outlet-type-appearance.sql` — adds non-null `outlet_types.color` and `icon` with defaults for existing rows. **Applied.**

- `0017_warehouse-type-appearance.sql` — adds non-null `warehouse_types.color` and `icon` with defaults for existing rows. **Applied.**

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
- `0011_free_krista_starr.sql` — adds `organizations.province` + `city`. **Applied.**
- `0012_red_wolfpack.sql` — adds the `wilayah` reference table (kode PK, nama) +
  `wilayah_nama_idx`, holding the local Indonesian region data from
  `dbdata/wilayah.sql`. **Applied.**
- `0013_flimsy_longshot.sql` — adds `organizations.district`, `village`,
  `postal_code`, `latitude`, `longitude`. **Applied.**
- `0014_cute_wasp.sql` — drops the now-unused `organizations.postal_code`. **Applied.**
- `0015_warehouse-types.sql` — adds the `warehouse_types` master-data table
  (per-org name + isActive, partial-unique `(organization_id, name)`) and
  `warehouses.warehouse_type_id` (FK → `warehouse_types`, `ON DELETE SET NULL`)
  + `warehouses_warehouse_type_idx`. **Applied.**
- `0016_warehouse-drop-depot-type.sql` — drops the legacy free-text
  `warehouses.depot_type` column. **Applied.** (Generated as two migrations
  because drizzle-kit's interactive rename prompt needs a TTY; see gotchas.)
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
  timezone, logo upload to S3 (old files are retained), private-file serving via
  `/api/files`. Currency, timezone and the wilayah fields are searchable
  `Combobox`es.
- **Area management** (`/master-data/areas`): CRUD (soft delete).
- **Warehouse management** (`/master-data/warehouses`): **full create/edit pages**
  (`/new`, `/[id]`) instead of a dialog. Fields: name, **warehouse type**
  (searchable `Combobox` fed by the `warehouse_types` master data, with a
  "Belum diatur" option), active flag,
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
- **Warehouse types** (`/master-data/warehouse-types`): CRUD (soft delete) master
  data for depot types (Utama, Transit, Cabang, …) — name + isActive, per-org
  partial-unique name (same shape as outlet types: search + sortable table +
  create/edit dialog). Gated by the `warehouse_types` permission. Feeds the
  warehouse form's "Tipe Gudang" dropdown.
- **Team** (`/settings/team`):
  - Tabs: **Semua**, **Struktur Organisasi**, **Back Office**, **Sales**.
  - **Struktur Organisasi** tab: recursive indented diagram (member cards →
    direct reports). Each node with subordinates is expand/collapse (chevron);
    root members start expanded and deeper levels start collapsed so the page
    stays compact.
  - **All** tab: members grouped by role, each group in its own table.
  - Search (name/email/code), status filter, pagination, sortable columns
    (incl. a **Kode pegawai** column). Rows (and the tree nodes) link to the
    member's edit page.
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
    form only pre-selects it for an Admin actor. Server-side
    `createMember`/`updateMember` also reject a non-admin trying to grant it
    ("Only an Admin can grant the Admin role.").
  - **Add member** (`/settings/team/new`) and **edit member**
    (`/settings/team/[id]`) are both **full pages** (not dialogs), sharing the
    same compact 2-column layout (**personal data on the left**, **Area & Gudang
    on the right**; `lg:grid-cols-2`). Create has no manual password field — the
    system generates the password, emails it once to the new member
    (non-expiring), and shows it on a credentials screen with a copy button
    (fallback if the email fails). Edit adds the "Aktif" switch plus
    reset-password and delete cards, and 404s for members outside the actor's
    subtree.
  - **Reset password**: Admin-only — non-admin managers never see the control
    (server action also rejects them). Members change their own from `/profile`.
  - Subtree visibility + area-subset enforcement for non-admins.
- **Soft delete** across all tables (schema + migration + actions + reads).
- **Sortable list tables**: every data table (Areas, Outlet types, Warehouses,
  Outlets, Team members) has click-to-sort column headers via
  `components/table-sort.tsx` — asc/desc toggle with an indicator icon; the
  active `sort`/`dir` live in the URL.
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
    warehouse-types.ts         create/update/delete warehouse type (per-org name)
    account.ts                 create/update/delete member (system-generated pw
                               + one credentials email), reset password
                               (Admin-only for other members)
    password-reset.ts          requestPasswordReset, completePasswordReset

src/app/(app)/profile/
  page.tsx                     own account details (server component)
  profile-form.tsx             read-only details + change-own-password form

src/app/(app)/master-data/warehouses/
  page.tsx                     warehouse list (joins area name)
  warehouses-client.tsx        search + area filter + paginated table + list/map tabs
  warehouses-map.tsx           Leaflet warehouse overview, type-colored icon pins + Head Office
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

src/app/(app)/master-data/warehouse-types/
  page.tsx                     warehouse type list (server component)
  warehouse-types-client.tsx   search + paginated table + dialog opener
  warehouse-type-dialog.tsx    create/edit/delete dialog (name + active)
  types.ts                     WarehouseTypeRow

src/app/(app)/settings/team/
  page.tsx                     team list (server: loads shared team data)
  team-client.tsx              tabs (Semua/Struktur Organisasi/Back Office/Sales),
                               grouped tables, filters, sorting; rows link to edit
  new/page.tsx                 create member page (server: loads shared team data)
  [id]/page.tsx                edit member page (server: loads shared team data)
  member-form.tsx              full-page create-member form (roles, atasan, areas,
                               warehouses, system-generated credentials)
  member-edit-form.tsx         full-page edit form (+ reset pw / delete cards)
  member-fields.tsx            shared member form fields + hooks (RoleSelect,
                               ReportingSelect, AreaChecklist, WarehouseChecklist)
  data.ts                      loadTeamData (options + visible members)
  types.ts                     RoleOption, AreaOption, WarehouseOption, MemberRow

src/components/
  app-shell.tsx                sidebar/header, permission-filtered nav
  page-header.tsx, brand.tsx
  location-picker.tsx          shared OpenStreetMap/Leaflet lat-lng picker (used by Outlets & Warehouses)
  use-wilayah-cascade.ts       province→village cascading state + map (OSM) sync
  ui/*                         shadcn/ui primitives (base-ui + radix)
  ui/combobox.tsx              searchable single-select (Base UI Combobox); now used
                               for all feature dropdowns in place of `ui/select`
  table-sort.tsx               `SortableHead` column header for server-sorted tables
  server-table-pagination.tsx  Shared URL query controls and page-size selector

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
- **Client URL state** uses `nuqs` (`tab`, `q`, `status`, `page`, `user`, `action`,
  and now `sort`/`dir` for table sorting).
- **Table queries**: parse URL parameters with `lib/table-query.ts`, apply tenant
  scope, search and filters in SQL, and count before fetching the page with
  `LIMIT`/`OFFSET`. Use `tableOrder` with a column allowlist and a stable ID
  tie-breaker. Clients use `useServerTable`, `SortableHead`, and
  `ServerTablePagination`. Set `shallow: false` on filters that fetch server data.
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
- **`db:generate` prompts when a diff removes one column and adds another**
  (drizzle-kit asks "is this a rename?"), which fails in a non-TTY shell with
  `Interactive prompts require a TTY terminal`. Workaround: split it into two
  generates — first add the new column (keeping the old one), then remove the old
  column in a second migration (see `0015`/`0016` for the warehouse-type swap).
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
