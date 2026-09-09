# BUILD_PLAN — Dompet Garuda Backoffice Frontend

Hand these prompts to Claude Code one at a time. Review and merge each PR before the next.

**Progress:** PR1–PR13 ✅ all merged and deployed. Backoffice is live at
`backoffice.dompetgaruda.com`, connected to the production API, with real per-user login,
full role-split ADMIN/WRITER experience, and device registration hardened for both MQTT
provisioning failures and correct Ed25519 public key format.

**Next: PR14 — Transaction History on user detail page**

Depends on the backend's Phase 3 Feature B (`GET /admin/users/{userId}/transactions`,
PR #38 in `dompet-garuda`) being merged and verified in production. Confirmed live.

---

## Completed (for reference)

1. ✅ **PR1 — Scaffold.**
2. ✅ **PR2 — Layout + Login** (password-only, later superseded by PR8).
3. ✅ **PR3 — Dashboard overview.**
4. ✅ **PR4 — Users page.** List, create, detail + top-up.
5. ✅ **PR5 — Devices page.** List, register (one-time token modal), detail + status update.
6. ✅ **PR6 — Sync Batches + Flagged pages.**
7. ✅ **PR7 — Deployment.** Dockerfile, CI/CD, Caddy.
8. ✅ **PR8 — Real login (email + password).**
9. ✅ **PR9 — Writer role dashboard.** Role-split sidebar, Tiptap editor, article CRUD.
10. ✅ **PR10 — Device registration, MQTT-aware error handling.** Distinct `503`
    (MQTT provisioning failure) vs generic validation error on the register-device form.
11. ✅ **PR11 — Self-host fonts.** Removed `next/font/google` build-time dependency —
    was causing intermittent CI failures (Google Fonts CDN occasionally blocks/
    rate-limits requests from cloud CI IP ranges).
12. ✅ **PR12 — Device form UX.** Added the required `deviceId` field (backend made
    it a mandatory, hardware-sourced string, no longer server-generated) and
    real-time client-side Public Key format feedback.
13. ✅ **PR13 — Public Key validation fix.** PR12's real-time check incorrectly
    validated for 32 raw bytes. Corrected to match the real format the backend
    actually expects: 44-byte Base64(X.509 SubjectPublicKeyInfo DER) — a fixed
    12-byte ASN.1 header + the 32-byte raw key, never 32 bytes alone.

---

## Current phase

14. **PR14 — Transaction History on user detail page.** New section at the bottom
    of the existing user detail page (below the Top Up Balance card), backed by
    `GET /admin/users/{userId}/transactions` (Phase 3 Feature B). Paginated table,
    type + date-range filters, status badges (`SUCCESS`/`PENDING`/`FAILED`/
    `REVERSED`). *This PR is next.*

## Not yet scoped (confirm before starting)

15. **Password change page.** Backend endpoint (`PATCH /admin/auth/password`)
    still doesn't exist — blocked on backend work.
16. **Analytics dashboard UI** (Phase 3 Feature C). Blocked on Feature C backend
    work, which hasn't started — Feature B needs to close out first.
17. **Article scheduling / categories.** Not requested yet — confirm with Faisal first.

---

## Next prompt to paste — PR14 (transaction history)

```
Read CLAUDE.md. Add transaction history section to the bottom of the user
detail page (src/app/(dashboard)/users/[userId]/page.tsx). Work on branch
feat/user-transaction-history, open PR against main.

Backend: GET /admin/users/{userId}/transactions?type=&from=&to=&page=0&size=20
Standard Admin JWT (same auth as every other admin call - no new auth pattern).

Response shape (confirmed from actual backend source):
{
  content: [{
    transactionId: number | null,  // null for PENDING/FAILED rows
    referenceId: string,
    type: string,        // e.g. "ONLINE_TRANSFER"
    direction: string,   // "DEBIT" | "CREDIT"
    amount: number,
    counterparty: string,
    status: string,      // "SUCCESS" | "PENDING" | "FAILED" | "REVERSED"
    notes: string,
    createdAt: string    // ISO instant
  }],
  page: number, size: number, totalElements: number, totalPages: number
}

1. Add to lib/api.ts:
   transactions: {
     listForUser: (userId: string, params?: { type?: string; from?: string;
       to?: string; page?: number; size?: number }) =>
       request<TransactionHistoryPage>(`/admin/users/${userId}/transactions?` +
         new URLSearchParams(params as any).toString())
   }

2. Add matching types to types/api.ts: TransactionHistoryItem,
   TransactionHistoryPage (per shape above).

3. New section at the BOTTOM of the user detail page, below the existing
   Top Up Balance card. Title "Transaction History". Use the existing
   DataTable shared component - columns: Date (formatDate), Type,
   Direction, Amount (formatCurrency, red for DEBIT/green for CREDIT),
   Counterparty, Status (StatusBadge - confirm PENDING/FAILED/REVERSED map
   to existing badge colors, add REVERSED as gray if not already mapped),
   Reference.

4. Pagination controls below the table (simple prev/next using page/
   totalPages from the response - keep consistent with existing patterns,
   this codebase doesn't use infinite scroll anywhere else).

5. Filter controls above the table: a type dropdown (ONLINE_TRANSFER,
   OFFLINE_TRANSFER, QR_PAYMENT_ONLINE, TOPUP, POUCH_LOAD, POUCH_REFUND)
   and a date range (two date inputs, from/to). Re-fetch on filter change,
   reset to page 0.

6. Loading state: Skeleton rows (existing pattern, not spinners). Empty
   state: EmptyState component if content is empty.

7. Handle transactionId being null (PENDING/FAILED rows) - don't render it
   as a clickable/linkable value, just show the reference/status as-is.

Don't touch the existing Top Up Balance card or User Info card above it -
purely additive at the bottom.

Open PR with a screenshot showing the new section with real data.
```

---

## After PR14 merges and deploys — verification checklist

```bash
open https://backoffice.dompetgaruda.com/users/<some-real-userId>
# Confirm: transaction rows show correct type/direction/amount/status
# Confirm: pagination works past page 0 if the user has >20 transactions
# Confirm: type filter and date range filter actually re-query
# Confirm: a user with ZERO transactions shows the empty state, not an error
```

---

## Standing reminders for every task

- One PR per task; keep them small and reviewable. Stop and ask if scope is unclear.
- Never push to main; never commit as the AI — commits are authored by your GitHub account.
- Never hardcode tokens, passwords, or secrets anywhere in this codebase.
- If a backend dependency (endpoint, field, behavior) isn't confirmed live yet, say so
  and wait rather than guessing at the shape of an API that doesn't exist — see the
  Public Key 32-vs-44-byte incident (PR12→PR13) for exactly what guessing wrong costs.
- **Update this file after each PR merges, not before** — this file going stale after
  PR9 (nobody updated it through PR10–13) is exactly the failure mode to avoid repeating.