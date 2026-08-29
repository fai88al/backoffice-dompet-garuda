# BUILD_PLAN — Dompet Garuda Backoffice Frontend

Hand these prompts to Claude Code one at a time. Review and merge each PR before the next.

**Progress:** PR1–PR9 ✅ all merged and deployed. Backoffice is live at
`backoffice.dompetgaruda.com`, connected to the production API, with real per-user login
and a fully role-split experience for `ADMIN` and `WRITER`.

**Next: PR10 — Device registration, MQTT-aware error handling**

This depends on the backend's MQTT per-device provisioning feature (FR25/FR26) being merged
and verified in production (confirmed: `POST /admin/devices` now provisions MQTT credentials
atomically with device registration; a `503` is returned if that provisioning fails, and the
whole registration is rolled back — see backend CLAUDE.md §15).

---

## Completed (for reference)

1. ✅ **PR1 — Scaffold.** Next.js 16, Bun, shadcn/ui, Tailwind, color palette, folder
   structure, `lib/api.ts` and `lib/auth.ts` skeletons, TypeScript types.
2. ✅ **PR2 — Layout + Login.** Root layout, auth layout, login page (password-only,
   later superseded by PR8), dashboard layout with sidebar/topbar, theme toggle.
3. ✅ **PR3 — Dashboard overview.** Stats cards, recent flagged transactions, recent sync
   batches, shared components (status-badge, page-header, empty-state, data-table).
4. ✅ **PR4 — Users page.** List, create, detail + top-up.
5. ✅ **PR5 — Devices page.** List, register (with one-time token modal), detail +
   status update. *This page is what PR10 below enhances.*
6. ✅ **PR6 — Sync Batches + Flagged pages.** Both list views, flagged resolve action.
7. ✅ **PR7 — Deployment.** Dockerfile, GitHub Actions CI/CD, deployed to
   `backoffice.dompetgaruda.com` via Caddy.
8. ✅ **PR8 — Real login (email + password).** Replaced the password-only login with a
   real email + password form against the backend's per-user accounts (`admin_users`
   table). `lib/auth.ts` stores role and username alongside the token.
9. ✅ **PR9 — Writer role dashboard.** Role-split sidebar (`ADMIN` vs `WRITER`), Tiptap
   rich-text editor, full article CRUD (create as DRAFT, edit, preview, publish/unpublish),
   `WRITER` redirected away from admin-only routes.

---

## Current phase

10. **PR10 — Device registration, MQTT-aware error handling.** The device registration
    form (built in PR5) predates the backend's MQTT provisioning feature. Registration can
    now fail with a `503` if MQTT provisioning fails on the backend (an atomic, all-or-
    nothing operation) — a failure mode the current generic error handling doesn't
    distinguish from a validation error. *This PR is next.*

## Not yet scoped (confirm before starting)

11. **Password change page.** Depends on the backend's password-change endpoint (not yet
    built) — needed so seeded temporary passwords can be rotated from the UI instead of a
    DB migration.
12. **Article scheduling / categories.** Not requested yet — confirm with Faisal first.

---

## After PR10 merges and deploys — verification checklist

Since a real `503` is hard to trigger on demand (it only happens if the broker is actually
unreachable), verify this two ways:

```bash
# 1. Confirm the happy path still works exactly as before
#    (this is the regression check - most important to not break)
open https://backoffice.dompetgaruda.com/devices/new
# Register a real test device, confirm the one-time token modal still
# shows the token exactly once with the copy button.

# 2. Simulate the 503 path, if feasible:
#    Temporarily stop the Mosquitto container on the VPS, attempt a
#    registration from the UI, confirm the distinct message appears,
#    then restart Mosquitto and confirm registration succeeds normally.
docker compose -f docker-compose.prod.yml stop mosquitto
# ... attempt registration in the UI, confirm the message ...
docker compose -f docker-compose.prod.yml start mosquitto
```

**Do not run the Mosquitto-stop test against production without a maintenance window** —
stopping Mosquitto affects the worker's ability to publish real notifications for any
in-flight offline sync settlements during that window. Prefer running this specific check
during low-traffic hours, or skip it if the code change is small enough to verify by
reading the diff carefully instead.

---

## Standing reminders for every task

- One PR per task; keep them small and reviewable. Stop and ask if scope is unclear.
- Never push to main; never commit as the AI — commits are authored by your GitHub account.
- Never hardcode tokens, passwords, or secrets anywhere in this codebase.
- If a backend dependency (endpoint, field, behavior) isn't confirmed live yet, say so
  and wait rather than guessing at the shape of an API that doesn't exist.