# CLAUDE.md — Dompet Digital Backoffice

> Context file for Claude Code. Read this fully before generating or editing any code.
> This is the **frontend** for the Dompet Digital admin backoffice.
> It is a separate codebase from the Spring Boot backend.

---

## 1. What this project is

A web-based backoffice panel for Dompet Digital administrators. It connects to the
existing REST API at `https://api.dompetgaruda.com` and provides a UI for managing
users, devices, sync batches, and flagged transactions.

Deployed at: `https://backoffice.dompetgaruda.com`

**Stage: prototype.** The UI must be functional and presentable for the client demo.
Prefer clarity and correctness over animation and complexity.

---

## 2. Tech stack (fixed — do not substitute without being asked)

- **Runtime:** Bun
- **Framework:** Next.js 16 (App Router, Turbopack default)
- **Node.js:** >= 20.9.0 required
- **Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **Dark mode:** next-themes (`darkMode: "class"` in tailwind.config)
- **HTTP client:** native `fetch` with a typed API service layer
- **State:** React built-ins only (useState, useContext) — no Redux, no Zustand
- **Forms:** react-hook-form + zod for validation
- **Icons:** lucide-react (already included with shadcn/ui)
- **Charts (dashboard):** recharts

> Do NOT add: Redux, MobX, React Query, Axios, SWR, or any other state/data-fetching
> library unless explicitly asked. Fetch + useState is sufficient for this prototype.

---

## 3. Color palette and design system

### Light mode
- **Primary:** `#5d7066` (sage green — buttons, active nav, focus rings, links)
- **Primary hover:** `#4a5c53`
- **Surface:** `#f1f1f1` (page background)
- **Card:** `#ffffff` (card/panel background)
- **Accent:** `#d9c6b0` (warm sand — badges, highlights, secondary elements)
- **Text primary:** `#1a1a1a`
- **Text secondary:** `#6b7280`
- **Border:** `#e5e7eb`
- **Danger:** `#dc2626` (red — destructive actions, error states)
- **Success:** `#16a34a` (green — settled status, success toasts)
- **Warning:** `#d97706` (amber — flagged status, warnings)

### Dark mode (derived)
- **Primary:** `#7a9e8a` (lightened sage)
- **Primary hover:** `#8fb09c`
- **Surface:** `#1a1f1b` (very dark sage)
- **Card:** `#242b26` (elevated surface)
- **Accent:** `#c4a882` (muted warm sand)
- **Text primary:** `#f1f1f1`
- **Text secondary:** `#9ca3af`
- **Border:** `#374151`

### Tailwind config additions

Add these to `tailwind.config.ts` under `theme.extend.colors`:

```ts
colors: {
  primary: {
    DEFAULT: '#5d7066',
    hover: '#4a5c53',
    dark: '#7a9e8a',
  },
  surface: '#f1f1f1',
  accent: {
    DEFAULT: '#d9c6b0',
    dark: '#c4a882',
  },
}
```

### shadcn/ui CSS variables

Override in `globals.css` to match the palette:

```css
:root {
  --background: 0 0% 94.5%;        /* #f1f1f1 */
  --foreground: 0 0% 10%;
  --primary: 150 10% 38%;           /* #5d7066 */
  --primary-foreground: 0 0% 98%;
  --accent: 35 30% 77%;             /* #d9c6b0 */
  --accent-foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --border: 220 13% 91%;
}

.dark {
  --background: 150 8% 11%;         /* #1a1f1b */
  --foreground: 0 0% 94.5%;
  --primary: 150 17% 56%;           /* #7a9e8a */
  --primary-foreground: 0 0% 10%;
  --accent: 35 27% 64%;             /* #c4a882 */
  --accent-foreground: 0 0% 94.5%;
  --card: 150 8% 15%;               /* #242b26 */
  --border: 217 19% 27%;
}
```

---

## 4. Project structure

```
src/
  app/
    (auth)/
      login/
        page.tsx          # Login page — public route
    (dashboard)/
      layout.tsx          # Authenticated shell: sidebar + topbar
      page.tsx            # Dashboard (redirect to /dashboard)
      dashboard/
        page.tsx          # Overview page
      users/
        page.tsx          # User list
        new/page.tsx      # Create user form
        [userId]/
          page.tsx        # User detail + top-up
      devices/
        page.tsx          # Device list
        new/page.tsx      # Register device form
        [deviceId]/
          page.tsx        # Device detail + status update
      sync/
        page.tsx          # Sync batches list
      flagged/
        page.tsx          # Flagged transactions list
    globals.css
    layout.tsx            # Root layout (ThemeProvider)
  components/
    ui/                   # shadcn/ui generated components (never edit manually)
    layout/
      sidebar.tsx
      topbar.tsx
      theme-toggle.tsx
    shared/
      status-badge.tsx    # Reusable badge for ACTIVE/SUSPENDED/FLAGGED/SETTLED etc.
      data-table.tsx      # Reusable table wrapper
      page-header.tsx     # Page title + optional action button
      confirm-dialog.tsx  # Reusable confirmation modal
      empty-state.tsx     # Empty list state
      error-boundary.tsx
  lib/
    api.ts                # ALL API calls live here — single source of truth
    auth.ts               # Token read/write from localStorage
    utils.ts              # cn() helper and formatters
  types/
    api.ts                # TypeScript types for all API responses
```

---

## 5. Authentication

- On login, call `POST /admin/auth/login` with the password.
- Store the returned token in `localStorage` as `dompet_admin_token`.
- All subsequent API calls include `Authorization: Bearer {token}` header.
- On any `401` response from the API, clear the token and redirect to `/login`.
- **No JWT decoding, no refresh tokens, no sessions** — the token is opaque.
  This is prototype-grade auth (see PRD NG1).

```ts
// lib/auth.ts
const TOKEN_KEY = 'dompet_admin_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
export const isAuthenticated = () => !!getToken()
```

Route protection: check `isAuthenticated()` in the dashboard layout. If false, redirect
to `/login`. Use `useRouter` from next/navigation — do not use middleware for this prototype.

---

## 6. API service layer

**All API calls must go through `lib/api.ts`.** Never call `fetch` directly from a component.
This is the single source of truth for every endpoint, base URL, and error handling.

```ts
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.dompetgaruda.com'

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// Exported API functions — one per endpoint
export const api = {
  auth: {
    login: (password: string) =>
      request<{ token: string; type: string }>('/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
  },
  users: {
    list: () => request<User[]>('/admin/users'),
    get: (userId: string) => request<UserDetail>(`/admin/users/${userId}`),
    create: (data: CreateUserRequest) =>
      request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    topUp: (userId: string, data: TopUpRequest) =>
      request<TopUpResponse>(`/admin/users/${userId}/topup`, {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  devices: {
    list: () => request<Device[]>('/admin/devices'),
    get: (deviceId: string) => request<DeviceDetail>(`/admin/devices/${deviceId}`),
    register: (data: RegisterDeviceRequest) =>
      request<RegisterDeviceResponse>('/admin/devices', {
        method: 'POST', body: JSON.stringify(data),
      }),
    updateStatus: (deviceId: string, status: DeviceStatus) =>
      request<Device>(`/admin/devices/${deviceId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      }),
  },
  sync: {
    list: (limit = 50) => request<SyncBatch[]>(`/admin/sync?limit=${limit}`),
  },
  flagged: {
    list: (resolved = false) =>
      request<FlaggedTransaction[]>(`/admin/flagged?resolved=${resolved}`),
    resolve: (flagId: number) =>
      request<FlaggedTransaction>(`/admin/flagged/${flagId}/resolve`, {
        method: 'PATCH',
      }),
  },
  certificates: {
    list: (status?: string) =>
      request<Certificate[]>(`/admin/certificates${status ? `?status=${status}` : ''}`),
  },
}
```

---

## 7. Routing and layout

- `(auth)` group — public, no sidebar. Only `/login`.
- `(dashboard)` group — requires auth. Has sidebar + topbar shell.
- Default route `/` redirects to `/dashboard`.

Sidebar navigation items:
```
Dashboard    → /dashboard
Users        → /users
Devices      → /devices
Sync Batches → /sync
Flagged      → /flagged
```

The sidebar shows the current user's auth status (just "Admin" for prototype)
and a logout button (clears token, redirects to /login).

---

## 8. Responsive and dark mode

- **Mobile-first.** The sidebar collapses to a hamburger menu on mobile.
- **Breakpoints:** sm (640px), md (768px), lg (1024px) — standard Tailwind.
- **On mobile:** sidebar is a slide-in drawer (use shadcn/ui Sheet component).
- **On tablet/desktop:** sidebar is fixed left, content fills the rest.
- **Dark mode toggle:** in the topbar, uses next-themes `useTheme()`.
  Toggle between `light` and `dark`. Default: `system`.

---

## 9. Key UI patterns

### Status badges
Reusable `<StatusBadge status="ACTIVE" />` component. Color mapping:
- `ACTIVE` / `SETTLED` / `DONE` → green
- `SUSPENDED` / `FLAGGED` / `FAILED` → red
- `LOCKED` / `PENDING` / `PROCESSING` → amber
- `EXPIRED` → gray

### Confirmations
Destructive actions (suspend device, resolve flag) must show a confirmation dialog
before calling the API. Use the `<ConfirmDialog />` shared component.

### Loading states
Use the shadcn/ui `Skeleton` component for loading states — not spinners.
Tables show skeleton rows while data loads.

### Error states
On API error, show a shadcn/ui `Alert` with the error message. Never show a raw
`Error` object or stack trace to the user.

### Empty states
Use `<EmptyState />` with a lucide icon and a short message when a list returns `[]`.

### Forms
Use `react-hook-form` + `zod` for all forms. Show inline validation errors below each field.
Show a `toast` (shadcn/ui Sonner) on success.

---

## 10. Environment variables

```
NEXT_PUBLIC_API_URL=https://api.dompetgaruda.com
```

Commit `.env.example` with this value. The real `.env.local` is gitignored.
Never put the admin token in environment variables — it lives in localStorage only.

---

## 11. Git workflow

- Work on feature branches (`feat/...`). Open PRs against `main`.
- Never push directly to `main`.
- Keep PRs focused — one page or one feature per PR.
- Always use my github account as contributor, don't use Claude

---

## 12. What NOT to do

- Don't call `fetch` directly from components — use `lib/api.ts`.
- Don't add Redux, Zustand, React Query, Axios, or SWR.
- Don't build writer role, article management, or landing page — phase 3.
- Don't add multi-admin accounts or role-based access — prototype has one admin.
- Don't add animations or page transitions — keep it fast and simple.
- Don't hardcode the API token anywhere in code or environment variables.
- Don't edit files in `components/ui/` — these are shadcn/ui generated files.
- Don't use `any` type in TypeScript — define proper types in `types/api.ts`.
- Don't use `<a>` tags for navigation — use Next.js `<Link>`.