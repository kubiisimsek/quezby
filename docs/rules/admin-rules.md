# Admin Panel Rules

- Apply to `apps/admin` and the API behind it (`/api/v1/admin`,
  `docs/backend/admin-api.md`). The panel is a static single-page app
  (Vite + React + Tailwind v4) served as plain files from shared hosting —
  no server of its own, no Next.js, no SSR.
- **The panel judges nothing.** It never imports `@quezby/engine` (lint) and
  never computes a score, rank, flag, risk or rate: it shows what the API
  sends. Approving or rejecting a run goes through `ModerationService`, nowhere
  else.
- **The API decides every permission.** Every admin route but the login
  declares its least role (`admin.role:viewer|moderator|owner`) and is listed
  in `RolesTest`. The panel only hides what a role cannot use (`lib/permissions.ts`,
  `navFor`) — hiding is not a check.
- **Staff and players never share a door.** Admin tokens come from the
  `admin` guard only and are refused by player routes; player tokens are
  refused by admin routes (`GuardIsolationTest`). Never widen a guard's provider.
- **Every change is on record.** A new mutating admin route writes an
  `AuditEntry` (with an `AuditAction` added on both sides of the contract) in
  the same transaction as the change. The audit log is never updated or deleted.
- **Moderation says why.** Banning, renaming, rejecting and deleting take a
  reason (3–191 characters); deleting a player also takes their username typed out.
- Secrets never reach the bundle. `VITE_*` values are public; only
  `VITE_API_ORIGIN` exists, and `scripts/package-admin.mjs` refuses a build
  with any other. The system page shows whether a token is set, never its value.
- Data comes through the SDK's admin client (`@quezby/sdk/admin`), handed down
  by `ApiProvider`, read in hooks under `src/hooks/api` with TanStack Query.
  Pages and components never call `fetch` (lint). A mutation invalidates what it
  changed (`afterModeration`).
- Lists are paged by the API (`AdminPage`: `items, page, perPage, total`);
  the panel never loads a whole table. Filters and the page live in the
  address bar (`useListParams`) — but never an email.
- **Design:** `docs/design/admin-design-system.md`. Build pages from
  `components/` — `Page` owns the band, width and rhythm; lists are
  `DataTable`s; every destructive act goes through `ConfirmModal` (or a
  `FormModal` with `submitTone="danger"`), focus on "Vazgeç"; never `alert()`
  or `confirm()`.
- Colours are roles only (`bg-surface`, `text-ink-muted`, `bg-primary`…): no
  hex, no raw ramp variables, no `dark:` classes in components. New colours go
  into the ramps and roles of `src/index.css`, and `scripts/admin-tokens.test.mjs`
  must still pass.
- Type is the role utilities (`text-display` … `text-micro`): no arbitrary
  sizes, no `uppercase`, nothing below 11 px. Sentence case, Turkish, "sen".
- Tests for every page, hook and kit piece with behaviour: Vitest + Testing
  Library on jsdom, against `fakeApi()` (shaped from the real client) —
  `src/test/`. Every admin endpoint has a Pest feature test.
- Hosting: `pnpm admin:package:staging|production` → one zip for the
  subdomain's document root (`docs/deployment/shared-hosting.md`). The build
  writes `.htaccess` (routing, caching, CSP naming the API) from
  `deploy/htaccess.mjs`; edit that, never the output.
