# BUILD_PLAN — Dompet Digital Backoffice Frontend

Hand these prompts to Claude Code one at a time. Review and merge each PR before the next.

**Progress:** PR1–PR7 ✅ all merged and deployed. Backoffice is live at
`backoffice.dompetgaruda.com`, connected to the production API.

**Next: PR8 — real login (email + password against real backend accounts)**

This depends on the backend's `feat/admin-user-auth` PR being merged and verified
(confirmed: `POST /admin/auth/login` now accepts `{ username, password }` and issues a
JWT; old `ADMIN_API_TOKEN` returns 401).

---

## Completed (for reference)

1. ✅ **PR1 — Scaffold.** Next.js 16, Bun, shadcn/ui, Tailwind, color palette, folder
   structure, `lib/api.ts` and `lib/auth.ts` skeletons, TypeScript types.
2. ✅ **PR2 — Layout + Login.** Root layout, auth layout, login page (password-only —
   now superseded by PR8), dashboard layout with sidebar/topbar, theme toggle.
3. ✅ **PR3 — Dashboard overview.** Stats cards, recent flagged transactions, recent sync
   batches, shared components (status-badge, page-header, empty-state, data-table).
4. ✅ **PR4 — Users page.** List, create, detail + top-up.
5. ✅ **PR5 — Devices page.** List, register (with one-time token modal), detail +
   status update.
6. ✅ **PR6 — Sync Batches + Flagged pages.** Both list views, flagged resolve action.
7. ✅ **PR7 — Deployment.** Dockerfile, GitHub Actions CI/CD, deployed to
   `backoffice.dompetgaruda.com` via Caddy.

---

## Current phase

8. **PR8 — Real login (email + password).** Replaces the password-only login with a
   real email + password form against the backend's new per-user accounts. Updates
   `lib/auth.ts` to store role and username alongside the token. *This PR is next.*

## Not yet scoped (confirm with Faisal before starting)

9. **Writer role dashboard.** A separate view (or role-gated section) for the `WRITER`
   role once article management exists on the backend. Not yet built — do not start
   without explicit scope confirmation.
10. **Article management UI.** Depends on backend article CRUD endpoints (not yet built).
11. **Password change page.** Depends on the backend's password-change endpoint (not yet
    built) — needed so the seeded temporary passwords can be rotated from the UI instead
    of a DB migration.

---

## Next prompt to paste — PR8 (real login)

```
Read CLAUDE.md fully — the auth section has changed to
email + password against real backend accounts.
Work on branch feat/real-login, open a PR against main.

This depends on the backend PR feat/admin-user-auth being
merged and deployed (confirmed: POST /admin/auth/login now
accepts { username, password } and returns a JWT + role +
username; the old static token returns 401).

1. Update lib/auth.ts to the version in CLAUDE.md §5
   (stores token, role, username — not just a token):

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

   Remove old setToken/clearToken and update every caller.

2. Update lib/api.ts:
   - auth.login signature becomes (username: string, password: string):
     login: (username: string, password: string) =>
       request<{ token: string; type: string; username: string; role: string }>(
         '/admin/auth/login',
         { method: 'POST', body: JSON.stringify({ username, password }) }
       ),
   - In the request() function's 401 handler, call clearAuth()
     instead of clearToken().

3. Update the login page (app/(auth)/login/page.tsx):
   - Add an Email field ABOVE Password (both required).
     Use type="email", label "Email".
   - zod schema: email (valid email format), password
     (required, min 8 chars)
   - On submit: api.auth.login(email, password)
   - On success: setAuth(token, role, username),
     redirect to /dashboard
   - On error: generic Alert "Invalid email or password"
     (never reveal which field was wrong — CLAUDE.md §12)
   - Keep existing loading state and dark mode support

4. Update the sidebar/topbar (components/layout/sidebar.tsx
   and/or topbar) to show getUsername() instead of the
   hardcoded "Admin" label.

5. Update every call site that used clearToken() for logout
   to use clearAuth() instead.

Open PR with screenshots of the updated login form (light +
dark mode) and confirmation that login works end-to-end
against the live API with both seeded accounts
(rizki@dompetgaruda.com, faisal@dompetgaruda.com).
```

---

## After PR8 merges and deploys — verification checklist

```bash
# 1. Open the live login page
open https://backoffice.dompetgaruda.com/login

# 2. Log in with each seeded account and confirm:
#    - Email + password fields both present
#    - Wrong password shows "Invalid email or password" (generic, not specific)
#    - Correct credentials redirect to /dashboard
#    - Sidebar/topbar shows the logged-in email, not "Admin"
#    - Dark mode toggle still works on the login page

# 3. Confirm logout clears everything:
#    - Click logout
#    - Should redirect to /login
#    - Refreshing /dashboard directly should redirect back to /login
#      (localStorage cleared)
```

Only after this checklist passes should any writer-role or article-management work begin —
those depend on backend endpoints that don't exist yet (see "Not yet scoped" above).

---

## Standing reminders for every task

- One PR per task; keep them small and reviewable. Stop and ask if scope is unclear.
- Never push to main; never commit as the AI — commits are authored by your GitHub account.
- Never hardcode tokens, passwords, or secrets anywhere in this codebase.
- If a backend dependency (endpoint, field, behavior) isn't confirmed live yet, say so
  and wait rather than guessing at the shape of an API that doesn't exist.