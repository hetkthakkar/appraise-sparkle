# Employee Performance & Appraisal Tool — Phase 1 + 2 Plan

Build a lightweight internal tool with **mock data only** (no DB, no real Google Sheets wiring yet). Stack: TanStack Start + React + TS + Tailwind v4 + shadcn/ui (already scaffolded).

## Design direction
- Clean, professional internal-tool aesthetic (think Linear/Notion-light).
- Neutral slate background, single indigo accent for primary actions, semantic tokens only — no hardcoded colors in components.
- Sidebar layout for authenticated pages, simple centered card for Login / Pending.

## Mock auth & role model
- `src/lib/mock-auth.tsx` — React context + `localStorage` persistence.
- Roles: `super_admin | admin | user | no_access`.
- "Google Sign-In" button cycles through 4 demo accounts (Super Admin, Admin/Team Lead, Employee, New user → No Access) via a small picker so reviewers can see every state without real OAuth.
- Super Admin can change any user's role from the User Management page (updates mock store in memory + localStorage).

## Mock data
- `src/lib/mock-data.ts` — employees, team leads, departments, monthly performance rows (current + 3 prior months), users list. Typed with shared interfaces in `src/lib/types.ts`.

## Routes (TanStack file-based, all under `src/routes/`)
```
__root.tsx              Shell + AuthProvider + QueryClient
index.tsx               Redirects: no_access→/pending, user→/me, admin→/admin, super→/dashboard, signed-out→/login
login.tsx               Google Sign-In mock with account picker
pending.tsx             "Awaiting approval" screen
_app.tsx                Pathless layout: sidebar + header + <Outlet/>, gates signed-in non-no_access
_app.dashboard.tsx      Super Admin dashboard (4 stat cards + recent uploads)
_app.admin.tsx          Admin (Team Lead) dashboard — team table + quick upload
_app.me.tsx             Employee dashboard — profile + current month perf + history table
_app.employees.tsx      Employee Management table (super admin: all; admin: own team)
_app.users.tsx          User & Role Management (super admin only)
_app.upload.tsx         Upload Center — two dropzones (employee master, monthly perf)
```
Role gating done in each route's `beforeLoad` via auth context.

## Components
- `src/components/app-sidebar.tsx` — shadcn sidebar, items filtered by role.
- `src/components/stat-card.tsx`, `metric-row.tsx` (target vs actual w/ progress bar), `upload-card.tsx` (drag-drop visual; parses filename only, shows toast).
- Reuse existing shadcn primitives (Card, Table, Select, Button, Badge, Progress, Sonner).

## Technical details
- No backend calls; uploads just read file name + show success toast ("Will sync to Google Sheets in Phase 3").
- Excel parse stubbed — we don't install xlsx yet; accept `.xlsx` in input and display row count = mock.
- All colors via `src/styles.css` tokens; tweak palette to slate/indigo, keep shadcn variables intact.
- sitemap.xml + robots.txt added per setup recipe (only `/login` is public-relevant).

## Out of scope (later phases)
- Real Google OAuth, Google Sheets API integration, real Excel parsing, charts, export to Excel.

## Deliverable
A clickable prototype where you can sign in as any of the 4 demo roles and see every screen with realistic mock data.
