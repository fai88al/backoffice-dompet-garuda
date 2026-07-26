# Writer Dashboard & Article Workflow — Design Spec

Branch: `feat/writer-dashboard` (off `main`). PR opened against `main` when complete.

## 1. Purpose

Add a `WRITER` role experience to the backoffice: a role-scoped sidebar, an article
list, and a full create/edit/preview/publish workflow using a Tiptap rich-text editor.
`ADMIN` behavior must be unaffected.

## 2. Role-based dashboard layout

- `Sidebar` (`src/components/layout/sidebar.tsx`) takes a `role: 'ADMIN' | 'WRITER'`
  prop and renders one of two nav lists:
  - `ADMIN` (unchanged): Dashboard, Users, Devices, Sync Batches, Flagged.
  - `WRITER` (new): Articles (`/articles`), New Article (`/articles/new`).
- `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) reads `getRole()` once
  alongside the existing `isAuthenticated()` check on mount:
  - No token / no role / role not in `{'ADMIN','WRITER'}` → redirect `/login`.
  - `role === 'WRITER'` and the current pathname is not `/articles` or
    `/articles/...` → redirect to `/articles`. This covers `/`, `/dashboard`,
    `/users`, `/devices`, `/sync`, `/flagged`.
  - `role === 'ADMIN'` → no change to current behavior.
- Topbar is unchanged for both roles (username + logout already role-agnostic).

## 3. API layer & types

`types/api.ts` additions:

```ts
export type ArticleStatus = 'DRAFT' | 'PUBLISHED'

export interface Article {
  id: string
  title: string
  slug: string
  contentHtml: string
  coverImageUrl: string | null
  status: ArticleStatus
  authorId: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateArticleRequest {
  title: string
  contentHtml: string
  coverImageUrl?: string
}

export interface UpdateArticleRequest {
  title?: string
  contentHtml?: string
  coverImageUrl?: string
}
```

`lib/api.ts` additions — `articles` block exactly as specified by the user:
`list(status?)`, `get(id)`, `create(data)`, `update(id, data)`, `publish(id)`,
`unpublish(id)`, `delete(id)`. All go through the existing `request<T>()` helper;
no new fetch logic.

## 4. Article list (`/articles`)

- `PageHeader` with title "Articles" and a "New Article" action button
  (→ `/articles/new`).
- Fetch once via `api.articles.list()` on mount (no status param). Tab state
  (All / Draft / Published) filters the already-fetched array client-side —
  no re-fetch per tab.
- `DataTable`: Title, Status (`StatusBadge`), Published At (or `—` for drafts),
  Updated At. Row click → `/articles/{id}/edit`.
- `Skeleton` rows while loading, `EmptyState` when the filtered list is empty.
- Accessible to both `ADMIN` and `WRITER`.

## 5. Editor (new/edit)

Shared `ArticleForm` component used by both `app/(dashboard)/articles/new/page.tsx`
and `app/(dashboard)/articles/[id]/edit/page.tsx`.

- Fields: Title (text, required), Cover Image URL (text, optional, `type="url"`),
  Content (Tiptap). Validation via `react-hook-form` + `zod`; inline errors below
  each field.
- Slug: read-only, shown only after the first successful save, as helper text
  "URL: /articles/{slug}" — never an editable input.
- Tiptap: `@tiptap/react` + `StarterKit` (headings, bold/italic, lists,
  blockquote, code block) + `@tiptap/extension-link` + `@tiptap/extension-image`.
  Toolbar buttons: bold, italic, H1-H3, bullet list, numbered list, blockquote,
  code block, link, image-by-URL.
  - Image-by-URL: a shadcn `Popover` (new `components/ui/popover.tsx`, generated
    via shadcn CLI) with a URL text input and an "Insert" button — not a native
    `prompt()`.
- Actions:
  - **Save Draft** — `create()` if new, `update()` if editing; never changes
    status. Toast on success, `Alert` on error.
  - **Preview** — opens `ArticlePreview` full-screen/modal, read-only.
    - From preview: **Publish** button → `ConfirmDialog` → `api.articles.publish(id)`
      → redirect to `/articles` on success.
  - **Unpublish** — shown only when editing an article with `status === 'PUBLISHED'`.
    `ConfirmDialog` → `api.articles.unpublish(id)`.
  - **Delete** — shown only in edit mode. `ConfirmDialog` → `api.articles.delete(id)`
    → redirect to `/articles`.

## 6. Preview component

`components/shared/article-preview.tsx`:

- Props: `title`, `coverImageUrl`, `contentHtml`.
- Renders title as a large heading, cover image if present, then `contentHtml`
  via `dangerouslySetInnerHTML` (trusted — writer-authored content only).
- Styled with a readable max-width column and generous line-height, using the
  palette from CLAUDE.md §3 (`primary`, `accent`, `surface`/`card`, `border`).

## 7. Dependencies

Add: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`,
`@tiptap/extension-link`. Add shadcn `popover` component via the shadcn CLI
(consistent with how existing `components/ui/*` files were generated — not
hand-written).

## 8. Out of scope

- No writer-specific `/dashboard` overview page — `WRITER` on `/dashboard` (or `/`)
  redirects straight to `/articles`.
- No public-facing article landing page (that's a separate, unscoped effort per
  CLAUDE.md §1/§12).
- No article categories, tags, comments, or scheduling — matches the backend
  shape given (`id, title, slug, contentHtml, coverImageUrl, status, authorId,
  publishedAt, createdAt, updatedAt`).

## 9. Testing / verification

- Manual verification: log in as `WRITER` → confirm Articles-only sidebar, no
  access to `/users` etc. (redirected). Log in as `ADMIN` → confirm sidebar
  unchanged.
- Create → save draft → edit → format content in Tiptap → preview → publish →
  confirm appears as Published in list. Unpublish and delete flows checked too.
- PR description includes screenshots: WRITER sidebar, article list, Tiptap
  editor with formatted content, preview view, publish confirmation dialog, and
  confirmation that ADMIN sidebar is unchanged.
