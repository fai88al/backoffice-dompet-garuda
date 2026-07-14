# BUILD_PLAN — Dompet Digital Backoffice Frontend

Hand these prompts to Claude Code one at a time. Review and merge each PR before the next.

---

## PR1 — Scaffold

```
Read CLAUDE.md fully before writing a single line.
Work on branch feat/scaffold, open a PR against main.

Scaffold the Dompet Digital backoffice frontend:

1. Initialize Next.js 16 App Router project using:
  bunx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

2. Install and configure:
   - Tailwind CSS
   - shadcn/ui (init with New York style, CSS variables enabled)
   - next-themes
   - react-hook-form
   - zod
   - recharts
   - lucide-react (comes with shadcn/ui)

3. Install these shadcn/ui components:
   button, input, label, card, badge, table, dialog, alert,
   sheet, skeleton, sonner (toast), dropdown-menu, avatar,
   separator, tooltip

4. Apply the color palette from CLAUDE.md §3:
   - Update globals.css with the CSS variable overrides
     for both :root (light) and .dark
   - Update tailwind.config.ts with the custom colors

5. Configure next-themes:
   - Wrap root layout with ThemeProvider (attribute="class",
     defaultTheme="system", enableSystem)

6. Create the complete folder structure from CLAUDE.md §4.
   Create placeholder files (empty components with a comment)
   for every file listed. Do not implement logic yet.

7. Create lib/auth.ts, lib/api.ts, lib/utils.ts with the
   exact content from CLAUDE.md §5 and §6.
   Create types/api.ts with these TypeScript types:
   - User, UserDetail, CreateUserRequest
   - Device, DeviceDetail, DeviceStatus, RegisterDeviceRequest,
     RegisterDeviceResponse
   - TopUpRequest, TopUpResponse
   - SyncBatch
   - FlaggedTransaction
   - Certificate
   Derive field names from the API response shapes at
   https://api.dompetgaruda.com/v3/api-docs

8. Create .env.example with NEXT_PUBLIC_API_URL=https://api.dompetgaruda.com
   Add .env.local to .gitignore.

9. Verify: bun dev starts without errors.
   The app renders at localhost:3000.

Open PR with confirmation that bun dev works and colors
are visible in the browser.
```

---

## PR2 — Layout + Login

```
Read CLAUDE.md fully. Work on branch feat/layout-login.

1. Root layout (app/layout.tsx):
   - ThemeProvider wrapping everything
   - Sonner Toaster component

2. Auth layout (app/(auth)/layout.tsx):
   - Centered card layout, full height, surface background
   - Shows the Dompet Digital logo/wordmark (text is fine)

3. Login page (app/(auth)/login/page.tsx):
   - Card with "Dompet Digital Backoffice" heading
   - Password field (not email — single admin password)
   - Submit button using primary color
   - react-hook-form + zod: password required, min 8 chars
   - On submit: call api.auth.login(password)
   - On success: setToken(token), redirect to /dashboard
   - On error: show Alert with "Invalid password"
   - Loading state: disable button + show spinner during request
   - Dark mode works correctly

4. Dashboard layout (app/(dashboard)/layout.tsx):
   - Check isAuthenticated() — if false, redirect to /login
   - Fixed sidebar (desktop) with nav items from CLAUDE.md §7
   - Mobile: sidebar in Sheet (hamburger button in topbar)
   - Topbar: page title area + dark mode toggle + logout button
   - Logout: clearToken() + redirect to /login

5. Sidebar component (components/layout/sidebar.tsx):
   - Nav items with lucide icons:
     LayoutDashboard → Dashboard
     Users → Users
     Smartphone → Devices
     RefreshCw → Sync Batches
     AlertTriangle → Flagged
   - Active state uses primary color
   - Collapses gracefully on mobile

6. ThemeToggle component (components/layout/theme-toggle.tsx):
   - Icon button: Sun in light mode, Moon in dark mode
   - Uses useTheme() from next-themes

7. Dashboard page (app/(dashboard)/dashboard/page.tsx):
   - Placeholder: "Dashboard coming soon" card
   - Just enough to confirm the layout renders

Open PR with screenshots of: login page (light + dark),
dashboard layout (desktop + mobile).
```

---

## PR3 — Dashboard overview page

```
Read CLAUDE.md fully. Work on branch feat/dashboard.

Dashboard page (app/(dashboard)/dashboard/page.tsx):

1. Stats cards row (4 cards):
   - Total Users (api.users.list(), count)
   - Total Devices (api.devices.list(), count)
   - Active Certificates (api.certificates.list('ACTIVE'), count)
   - Unresolved Flags (api.flagged.list(false), count)
   Each card: shadcn Card with a lucide icon, big number,
   and a small label. Loading: Skeleton.

2. Recent Flagged Transactions table (last 5):
   - Columns: Reason, Detail (truncated), Created At
   - StatusBadge for reason
   - Link to /flagged for "View all"

3. Recent Sync Batches table (last 5):
   - Columns: Batch ID (truncated), Status, Received At
   - StatusBadge for status
   - Link to /sync for "View all"

4. All data fetched in parallel with Promise.all.
   Loading state: Skeleton rows.
   Error state: Alert with message.

Create shared components:
- components/shared/status-badge.tsx (per CLAUDE.md §9)
- components/shared/page-header.tsx
- components/shared/empty-state.tsx
- components/shared/data-table.tsx

Open PR with screenshot of dashboard with real API data.
```

---

## PR4 — Users page

```
Read CLAUDE.md fully. Work on branch feat/users.

1. Users list (app/(dashboard)/users/page.tsx):
   - PageHeader: "Users" + "Create User" button
   - Table: Full Name, Phone, Status, Online Balance
     (formatted as Rp X,XXX,XXX), Device Count, Created At
   - StatusBadge for status
   - Row click → /users/{userId}
   - EmptyState if no users

2. Create user (app/(dashboard)/users/new/page.tsx):
   - Form: Full Name (required), Phone (required, +62...)
   - On submit: api.users.create()
   - On success: toast + redirect to /users
   - On error: Alert with message
   - Cancel → back to /users

3. User detail (app/(dashboard)/users/[userId]/page.tsx):
   - Info card: userId, status, createdAt, onlineBalance, deviceCount
   - Top-up form inline:
     Amount (number, min 1000), Reference (optional)
     On success: toast + refresh balance
   - Devices table with link to /devices/{deviceId}

Open PR with screenshots of all three pages.
```

---

## PR5 — Devices page

```
Read CLAUDE.md fully. Work on branch feat/devices.

1. Devices list (app/(dashboard)/devices/page.tsx):
   - PageHeader: "Devices" + "Register Device" button
   - Table: Device ID (truncated, monospace), User Phone,
     Status, Last Counter, Registered At,
     Active Certificate amount or "None"
   - StatusBadge for status

2. Register device (app/(dashboard)/devices/new/page.tsx):
   - Form: User select (from api.users.list()),
     Public Key (textarea), Device Label (optional)
   - On success: show one-time token modal with copy button
     and WARNING message. After dismiss: redirect to /devices

3. Device detail (app/(dashboard)/devices/[deviceId]/page.tsx):
   - Info card with all device fields
   - Status update: Activate / Suspend / Lock buttons
     Each with ConfirmDialog before calling api
   - Active certificate card if present

Create components/shared/confirm-dialog.tsx.

Open PR with screenshots including one-time token modal.
```

---

## PR6 — Sync Batches + Flagged pages

```
Read CLAUDE.md fully. Work on branch feat/sync-flagged.

1. Sync batches (app/(dashboard)/sync/page.tsx):
   - Table: Batch ID, Device ID, Status, Synced After Expiry,
     Received At, Processed At, Error Reason
   - StatusBadge for status

2. Flagged transactions (app/(dashboard)/flagged/page.tsx):
   - Toggle: Unresolved / All
   - Table: Flag ID, Reason, Detail, Created At, Resolved,
     Batch ID, Certificate ID
   - Resolve button per unresolved row with ConfirmDialog
   - On resolve: toast + refresh

Open PR with screenshots of both pages.
```

---

## PR7 — Deployment

```
Read CLAUDE.md fully. Work on branch feat/deployment.

1. Dockerfile (multi-stage):
   Stage 1 deps: install bun, install dependencies
   Stage 2 builder: bun run build
   Stage 3 runner: copy .next/standalone, run as non-root,
   EXPOSE 3000

2. Set output: 'standalone' in next.config.ts.

3. .github/workflows/deploy.yml:
   - build-and-push: build + push to GHCR
   - deploy: SSH to VPS, docker compose up -d backoffice
   Trigger: push to main + workflow_dispatch

4. Document in README.md:
   - How to add backoffice service to docker-compose.prod.yml
     in the backend repo
   - How to add backoffice.dompetgaruda.com to Caddyfile
   - DNS: A record backoffice → 72.60.74.117

Open PR. After merge, the backend repo needs a companion
PR to add the service and Caddyfile block.
```