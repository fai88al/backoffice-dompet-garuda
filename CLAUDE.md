# CLAUDE.md — Dompet Digital Backoffice

> Context file for Claude Code. Read this fully before generating or editing any code.
> This is the **frontend** for the Dompet Digital admin backoffice.
> It is a separate codebase from the Spring Boot backend.

---

## 1. What this project is

A web-based backoffice panel for Dompet Digital administrators and writers. It connects to
the existing REST API at `https://api.dompetgaruda.com` and provides a UI for managing
users, devices, sync batches, flagged transactions, and — for the `WRITER` role — articles.

Deployed at: `https://backoffice.dompetgaruda.com`

**Stage: prototype, but in active daily use** by the client for user/device management and
article publishing. Prefer clarity and correctness over animation and complexity.

**Two roles exist and are both fully built:**
- **`ADMIN`** — full access: dashboard, users, devices, sync batches, flagged transactions.
- **`WRITER`** — article management only (create, edit, preview, publish/unpublish). A
  `WRITER` navigating to an admin-only route is redirected to `/articles`.

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
- **Rich text editor (articles, WRITER role):** Tiptap

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

```css
:root {
  --background: 0 0% 94.5%;
  --foreground: 0 0% 10%;
  --primary: 150 10% 38%;
  --primary-foreground: 0 0% 98%;
  --accent: 35 30% 77%;
  --accent-foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --border: 220 13% 91%;
}

.dark {
  --background: 150 8% 11%;
  --foreground: 0 0% 94.5%;
  --primary: 150 17% 56%;
  --primary-foreground: 0 0% 10%;
  --accent: 35 27% 64%;
  --accent-foreground: 0 0% 94.5%;
  --card: 150 8% 15%;
  --border: 217 19% 27%;
}
```

---

## 4. Project structure (current — reflects what's actually built)

```
src/
  app/
    (auth)/
      login/
        page.tsx          # Login page — public route, email + password
    (dashboard)/
      layout.tsx          # Authenticated shell: sidebar + topbar, role-gated nav
      page.tsx            # Redirects to /dashboard (ADMIN) or /articles (WRITER)
      dashboard/
        page.tsx          # ADMIN only — overview
      users/
        page.tsx          # ADMIN only — user list
        new/page.tsx
        [userId]/page.tsx
      devices/
        page.tsx          # ADMIN only — device list
        new/page.tsx      # Register device form — see §9a for MQTT-aware behavior
        [deviceId]/page.tsx
      sync/
        page.tsx          # ADMIN only
      flagged/
        page.tsx          # ADMIN only
      articles/
        page.tsx          # WRITER + ADMIN — article list
        new/page.tsx      # Tiptap editor, create as DRAFT
        [articleId]/
          page.tsx         # Edit existing article
          preview/page.tsx # Read-only rendered preview before publish
    globals.css
    layout.tsx            # Root layout (ThemeProvider)
  components/
    ui/                   # shadcn/ui generated components (never edit manually)
    layout/
      sidebar.tsx          # Role-gated: ADMIN sees full nav, WRITER sees Articles only
      topbar.tsx           # Shows getUsername(), logout button
      theme-toggle.tsx
    editor/
      tiptap-editor.tsx    # Rich text editor wrapper for articles
    shared/
      status-badge.tsx
      data-table.tsx
      page-header.tsx
      confirm-dialog.tsx
      empty-state.tsx
      error-boundary.tsx
      one-time-secret-modal.tsx  # See §9a — reusable for device token display
  lib/
    api.ts                # ALL API calls live here — single source of truth
    auth.ts               # Token/role/username read/write from localStorage
    utils.ts
  types/
    api.ts                # TypeScript types for all API responses
```

---

## 5. Authentication — DELIVERED (real login, both roles)

- Login form collects **email + password** (backend's `username` field holds an email).
- `POST /admin/auth/login` with `{ username, password }` → `{ token, type, username, role }`.
- Stored in `localStorage`: `dompet_admin_token`, `dompet_admin_role`, `dompet_admin_username`.
- All API calls include `Authorization: Bearer {token}`.
- On any `401`, clear all stored auth values and redirect to `/login`.
- Login never reveals whether the email or the password was wrong — always a generic
  "Invalid email or password."

```ts
// lib/auth.ts
const TOKEN_KEY = 'dompet_admin_token'
const ROLE_KEY = 'dompet_admin_role'
const USERNAME_KEY = 'dompet_admin_username'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getRole = () => localStorage.getItem(ROLE_KEY)
export const getUsername = () => localStorage.getItem(USERNAME_KEY)

export const setAuth = (token: string, role: string, username: string) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, role)
  localStorage.setItem(USERNAME_KEY, username)
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export const isAuthenticated = () => !!getToken()
```

**Role gating (delivered):** the dashboard layout checks `getRole()`. `ADMIN` sees the full
sidebar (Dashboard, Users, Devices, Sync, Flagged). `WRITER` sees only Articles/New Article.
A `WRITER` who navigates directly to an admin-only URL is redirected to `/articles`.

---

## 6. API service layer

**All API calls must go through `lib/api.ts`.** Never call `fetch` directly from a component.

```ts
// lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.dompetgaruda.com'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    clearAuth()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    // Preserve the status so callers can distinguish failure types —
    // see §9a for why this matters for device registration specifically.
    const err = new Error(error.message ?? `HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json()
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; type: string; username: string; role: string }>(
        '/admin/auth/login',
        { method: 'POST', body: JSON.stringify({ username, password }) }
      ),
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
      request<FlaggedTransaction>(`/admin/flagged/${flagId}/resolve`, { method: 'PATCH' }),
  },
  certificates: {
    list: (status?: string) =>
      request<Certificate[]>(`/admin/certificates${status ? `?status=${status}` : ''}`),
  },
  articles: {
    list: (status?: 'DRAFT' | 'PUBLISHED') =>
      request<Article[]>(`/admin/articles${status ? `?status=${status}` : ''}`),
    get: (articleId: string) => request<ArticleDetail>(`/admin/articles/${articleId}`),
    create: (data: CreateArticleRequest) =>
      request<Article>('/admin/articles', { method: 'POST', body: JSON.stringify(data) }),
    update: (articleId: string, data: UpdateArticleRequest) =>
      request<Article>(`/admin/articles/${articleId}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    publish: (articleId: string) =>
      request<Article>(`/admin/articles/${articleId}/publish`, { method: 'POST' }),
    unpublish: (articleId: string) =>
      request<Article>(`/admin/articles/${articleId}/unpublish`, { method: 'POST' }),
    delete: (articleId: string) =>
      request<void>(`/admin/articles/${articleId}`, { method: 'DELETE' }),
  },
}
```

---

## 7. Routing and layout

- `(auth)` group — public, no sidebar. Only `/login`.
- `(dashboard)` group — requires auth. Has sidebar + topbar shell, role-gated content.
- Default route `/` redirects to `/dashboard` (`ADMIN`) or `/articles` (`WRITER`).

**Sidebar navigation — ADMIN:**
```
Dashboard    → /dashboard
Users        → /users
Devices      → /devices
Sync Batches → /sync
Flagged      → /flagged
```

**Sidebar navigation — WRITER:**
```
Articles     → /articles
New Article  → /articles/new
```

The topbar shows the logged-in user's **email** (`getUsername()`) plus a logout button.

---

## 8. Responsive and dark mode

- **Mobile-first.** Sidebar collapses to a hamburger menu / Sheet drawer on mobile.
- **Breakpoints:** sm (640px), md (768px), lg (1024px).
- **Dark mode toggle:** topbar, `next-themes` `useTheme()`. Default: `system`.

---

## 9. Key UI patterns

### Status badges
`<StatusBadge status="ACTIVE" />`:
- `ACTIVE` / `SETTLED` / `DONE` / `PUBLISHED` → green
- `SUSPENDED` / `FLAGGED` / `FAILED` → red
- `LOCKED` / `PENDING` / `PROCESSING` / `DRAFT` → amber
- `EXPIRED` → gray

### Confirmations
Destructive actions (suspend device, resolve flag, unpublish article, delete article) must
show a confirmation dialog before calling the API — `<ConfirmDialog />`.

### Loading states
shadcn/ui `Skeleton` — not spinners. Tables show skeleton rows while loading.

### Error states
`Alert` with the error message — never a raw `Error` object or stack trace. Login never
reveals which field was wrong (§5).

### Empty states
`<EmptyState />` with a lucide icon and short message when a list returns `[]`.

### Forms
`react-hook-form` + `zod`. Inline validation errors below each field. `toast` (Sonner) on
success.

---

## 9a. Device registration — MQTT-aware behavior (NEW, backend context)

As of the backend's MQTT per-device provisioning feature, `POST /admin/devices` now does
**more** than create a database row: it also provisions MQTT credentials for the device as
a **mandatory** part of registration (backend `MqttAdminClient`, backend PRD FR25). If MQTT
provisioning fails on the backend, the **entire registration is rolled back** and the API
returns **`503 Service Unavailable`** instead of `201 Created` — a failure mode that did not
exist when the device registration page was first built.

**What this means for the frontend:**

1. **Distinguish a `503` from other failures in the register-device form.** Using the
   `err.status` now preserved by `request()` (§6), a `503` on `POST /admin/devices` should
   show a specific message — e.g. "Pendaftaran gagal: sistem notifikasi sedang bermasalah,
   coba lagi dalam beberapa saat." — rather than a generic error. This is not the user's
   fault (bad input) and retrying later is often the correct action, so the message should
   reflect that rather than reading like a validation error.
2. **On success, the one-time token modal may note that MQTT notification is also ready.**
   A short line such as "Perangkat siap menerima notifikasi otomatis" is optional polish —
   not required, but accurately reflects that registration succeeding means MQTT provisioning
   also succeeded (they're now atomic on the backend).
3. **No new fields are needed in the registration form.** The frontend does not send or
   receive anything MQTT-specific — this is entirely a backend-side side effect. Do not add
   an "MQTT username" or "MQTT password" field anywhere; the device token already shown in
   the one-time-secret modal **is** the MQTT password (backend reuses it, mints no new
   secret) — this is backend detail, not something the UI needs to expose or explain further.

**The one-time token modal itself (already built in PR5) remains the most safety-critical
piece of this page** — the device token is shown exactly once; the backend stores only its
hash. If this modal is ever changed, preserve: a persistent copy-to-clipboard button, a
visible "you will not see this again" warning, and no auto-dismiss.

---

## 10. Environment variables

```
NEXT_PUBLIC_API_URL=https://api.dompetgaruda.com
```

Commit `.env.example`. Never put the admin token, JWT secret, or any password in environment
variables — auth tokens live in localStorage only, issued fresh per login by the backend.

---

## 11. Git workflow

- Work on feature branches (`feat/...`). Open PRs against `main`.
- Never push directly to `main`.
- Keep PRs focused — one page or one feature per PR.
- Always use my GitHub account as contributor — never Claude.

---

## 12. What NOT to do

- Don't call `fetch` directly from components — use `lib/api.ts`.
- Don't add Redux, Zustand, React Query, Axios, or SWR.
- Don't add public signup or self-registration — accounts are backend-seeded/admin-created only.
- Don't add animations or page transitions — keep it fast and simple.
- Don't hardcode any token, password, or JWT secret anywhere in code or environment variables.
- Don't edit files in `components/ui/` — shadcn/ui generated files.
- Don't use `any` type in TypeScript — define proper types in `types/api.ts`.
- Don't use `<a>` tags for navigation — use Next.js `<Link>`.
- Don't reveal in the UI whether an email or a password was the reason login failed.
- **Don't add any MQTT-specific field, username, or password input anywhere in the device
  forms — see §9a.** The device token already covers this; do not expose backend
  implementation detail in the UI.
- **Don't treat a `503` on device registration the same as a validation error (400/422)** —
  see §9a for the distinct handling required.