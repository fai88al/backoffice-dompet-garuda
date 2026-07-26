# Writer Dashboard & Article Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `WRITER` role experience — a role-scoped sidebar, an article list, and a full create/edit/preview/publish workflow using a Tiptap rich-text editor — without changing `ADMIN` behavior.

**Architecture:** Extend the existing `lib/api.ts` single-source-of-truth API layer with an `articles` section, extend `Sidebar`/`DashboardLayout` to branch on `getRole()`, and add new route segments (`/articles`, `/articles/new`, `/articles/[id]/edit`) that reuse the existing shared components (`PageHeader`, `DataTable`, `StatusBadge`, `ConfirmDialog`, `EmptyState`).

**Tech Stack:** Next.js 16 App Router, React 19, react-hook-form + zod, shadcn/ui (New York style, CSS variables), Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`), sonner toasts.

## Global Constraints

- Never call `fetch` directly from a component — all article calls go through `lib/api.ts` (CLAUDE.md §6).
- No `any` type anywhere — add proper types to `types/api.ts` (CLAUDE.md §12).
- Use Next.js `<Link>` for navigation, never `<a>` (CLAUDE.md §12).
- Don't edit generated files under `src/components/ui/` by hand — only add new ones via the shadcn CLI (CLAUDE.md §12, this spec §7).
- Destructive/state-changing actions (delete, publish, unpublish) must go through `<ConfirmDialog />` (CLAUDE.md §9).
- Loading states use `Skeleton`, not spinners, for lists (CLAUDE.md §9); empty lists use `<EmptyState />`.
- On API error, show a shadcn `Alert` with the error message — never a raw `Error`/stack trace (CLAUDE.md §9).
- Toast (sonner) on form-action success (CLAUDE.md §9).
- No test framework exists in this repo (no jest/vitest configured; no existing page has tests). Verification for every task is: `bun run lint`, `bunx tsc --noEmit`, and a manual check in the running dev server — not automated unit tests.
- Package manager is Bun (CLAUDE.md §2) — use `bun add` / `bun run`, not `npm`/`yarn`.
- Work happens on `feat/writer-dashboard` (already created and checked out); commit after each task.

---

### Task 1: Install Tiptap and the shadcn Popover component

**Files:**
- Modify: `package.json`, `bun.lock` (via `bun add`)
- Create: `src/components/ui/popover.tsx` (via shadcn CLI — generated, do not hand-edit further)

**Interfaces:**
- Produces: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link` importable in later tasks. `Popover`, `PopoverTrigger`, `PopoverContent` exported from `@/components/ui/popover` for Task 6's image-by-URL UI.

- [ ] **Step 1: Install Tiptap packages**

Run:
```bash
bun add @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
```

- [ ] **Step 2: Generate the shadcn Popover component**

Run:
```bash
bunx --bun shadcn@latest add popover
```

If the CLI prompts for overwrite confirmation on any shared file, decline (answer no) — only `src/components/ui/popover.tsx` should be created.

- [ ] **Step 3: Verify the install**

Run: `bunx tsc --noEmit`
Expected: no new type errors. Confirm `src/components/ui/popover.tsx` exists and exports `Popover`, `PopoverTrigger`, `PopoverContent`.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock src/components/ui/popover.tsx
git commit -m "chore: add tiptap and shadcn popover dependencies"
```

---

### Task 2: Article types and API service layer

**Files:**
- Modify: `src/types/api.ts` (append at end of file)
- Modify: `src/lib/api.ts` (add import + `articles` block to the `api` object)

**Interfaces:**
- Consumes: existing `request<T>()` helper from `src/lib/api.ts:21-47` (unchanged signature).
- Produces:
  - `ArticleStatus = 'DRAFT' | 'PUBLISHED'`
  - `Article { id: string; title: string; slug: string; contentHtml: string; coverImageUrl: string | null; status: ArticleStatus; authorId: string; publishedAt: string | null; createdAt: string; updatedAt: string }`
  - `CreateArticleRequest { title: string; contentHtml: string; coverImageUrl?: string }`
  - `UpdateArticleRequest { title?: string; contentHtml?: string; coverImageUrl?: string }`
  - `api.articles.list(status?: 'DRAFT' | 'PUBLISHED') => Promise<Article[]>`
  - `api.articles.get(id: string) => Promise<Article>`
  - `api.articles.create(data: CreateArticleRequest) => Promise<Article>`
  - `api.articles.update(id: string, data: UpdateArticleRequest) => Promise<Article>`
  - `api.articles.publish(id: string) => Promise<Article>`
  - `api.articles.unpublish(id: string) => Promise<Article>`
  - `api.articles.delete(id: string) => Promise<void>`

- [ ] **Step 1: Add article types**

Append to `src/types/api.ts`:

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

- [ ] **Step 2: Add the `articles` API section**

In `src/lib/api.ts`, add to the type-only import block (currently lines 2-16):

```ts
  Article,
  ArticleStatus,
  CreateArticleRequest,
  UpdateArticleRequest,
```

Then add a new top-level key to the `api` object (after `certificates`, before the closing `}` at line 94):

```ts
  articles: {
    list: (status?: ArticleStatus) =>
      request<Article[]>(`/admin/articles${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<Article>(`/admin/articles/${id}`),
    create: (data: CreateArticleRequest) =>
      request<Article>('/admin/articles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateArticleRequest) =>
      request<Article>(`/admin/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    publish: (id: string) =>
      request<Article>(`/admin/articles/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) =>
      request<Article>(`/admin/articles/${id}/unpublish`, { method: 'POST' }),
    delete: (id: string) =>
      request<void>(`/admin/articles/${id}`, { method: 'DELETE' }),
  },
```

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/api.ts src/lib/api.ts
git commit -m "feat: add articles API service and types"
```

---

### Task 3: Role-based sidebar and dashboard layout redirect

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `getRole()` from `src/lib/auth.ts:6` (returns `string | null`).
- Produces: `Sidebar` now requires a `role: 'ADMIN' | 'WRITER'` prop (breaking change to its existing signature — Topbar's usage is updated in this task too).

- [ ] **Step 1: Split nav items by role in `Sidebar`**

Replace the contents of `src/components/layout/sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Newspaper,
  FilePlus,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type NavRole = 'ADMIN' | 'WRITER'

const adminNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/devices', label: 'Devices', icon: Smartphone },
  { href: '/sync', label: 'Sync Batches', icon: RefreshCw },
  { href: '/flagged', label: 'Flagged', icon: AlertTriangle },
]

const writerNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/articles', label: 'Articles', icon: Newspaper },
  { href: '/articles/new', label: 'New Article', icon: FilePlus },
]

export function Sidebar({
  role,
  onNavigate,
}: {
  role: NavRole
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const navItems = role === 'WRITER' ? writerNavItems : adminNavItems

  return (
    <nav className="flex h-full w-full flex-col gap-1 p-4">
      <span className="mb-4 px-2 text-lg font-semibold tracking-tight text-primary">
        Dompet Digital
      </span>
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Thread `role` through `Topbar`**

Read `src/components/layout/topbar.tsx` first to confirm current props, then add a `role: 'ADMIN' | 'WRITER'` prop to `Topbar` and pass it to both `<Sidebar>` usages (desktop trigger content and the `SheetContent`):

```tsx
export function Topbar({
  role,
  onLogout,
}: {
  role: 'ADMIN' | 'WRITER'
  onLogout: () => void
}) {
```

and update the `<Sidebar />` call inside `SheetContent` to `<Sidebar role={role} />`.

- [ ] **Step 3: Add role gating to `DashboardLayout`**

Replace `src/app/(dashboard)/layout.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { isAuthenticated, clearAuth, getRole } from '@/lib/auth'

type Role = 'ADMIN' | 'WRITER'

function isValidRole(role: string | null): role is Role {
  return role === 'ADMIN' || role === 'WRITER'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    const storedRole = getRole()
    if (!isValidRole(storedRole)) {
      clearAuth()
      router.replace('/login')
      return
    }
    if (storedRole === 'WRITER' && !(pathname === '/articles' || pathname.startsWith('/articles/'))) {
      router.replace('/articles')
      return
    }
    // One-time client auth/role gate on mount — not a derived-state loop, so the
    // set-state-in-effect lint rule doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(storedRole)
  }, [router, pathname])

  const handleLogout = () => {
    clearAuth()
    router.replace('/login')
  }

  if (!role) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <Sidebar role={role} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors. (Task 4 adds the `/articles` route the WRITER redirect points to — until then, manual verification of the redirect isn't possible, but typecheck confirms the wiring compiles.)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/topbar.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "feat: branch sidebar and dashboard layout by role"
```

---

### Task 4: Article list page

**Files:**
- Create: `src/app/(dashboard)/articles/page.tsx`

**Interfaces:**
- Consumes: `api.articles.list()` (Task 2), `PageHeader`, `DataTable`, `StatusBadge`, `EmptyState` (existing shared components), `formatDate` from `src/lib/utils.ts`.
- Produces: route `/articles`, reachable by both roles.

- [ ] **Step 1: Write the page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Article } from '@/types/api'

type FilterTab = 'ALL' | 'DRAFT' | 'PUBLISHED'

export default function ArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('ALL')

  useEffect(() => {
    let cancelled = false

    api.articles
      .list()
      .then((data) => {
        if (!cancelled) setArticles(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load articles')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filtered = (articles ?? []).filter((a) => tab === 'ALL' || a.status === tab)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Articles"
        action={
          <Button asChild>
            <Link href="/articles/new">New Article</Link>
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft</TabsTrigger>
          <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={filtered}
            loading={!articles && !error}
            keyField={(row) => row.id}
            emptyMessage="No articles yet"
            onRowClick={(row) => router.push(`/articles/${row.id}/edit`)}
            columns={[
              { header: 'Title', cell: (row) => row.title },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Published At',
                className: 'text-muted-foreground',
                cell: (row) => (row.publishedAt ? formatDate(row.publishedAt) : '—'),
              },
              {
                header: 'Updated At',
                className: 'text-muted-foreground',
                cell: (row) => formatDate(row.updatedAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Add the shadcn Tabs component (used above but not yet generated)**

Run:
```bash
bunx --bun shadcn@latest add tabs
```

- [ ] **Step 3: Typecheck and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `bun run dev`, log in, navigate to `/articles`. Confirm: page renders with skeleton rows while loading, then either the table or the "No articles yet" empty state (since the backend likely has no articles yet), and the tab toggle filters the list without a network request per click (check the Network tab — only one `GET /admin/articles` call total).

- [ ] **Step 5: Commit**

```bash
git add src/app/"(dashboard)"/articles/page.tsx src/components/ui/tabs.tsx
git commit -m "feat: add article list page"
```

---

### Task 5: Article preview component

**Files:**
- Create: `src/components/shared/article-preview.tsx`

**Interfaces:**
- Produces: `ArticlePreview({ title, coverImageUrl, contentHtml }: { title: string; coverImageUrl: string | null; contentHtml: string })` — a presentational component consumed by Task 6's editor page.

- [ ] **Step 1: Write the component**

```tsx
export function ArticlePreview({
  title,
  coverImageUrl,
  contentHtml,
}: {
  title: string
  coverImageUrl: string | null
  contentHtml: string
}) {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      {coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImageUrl}
          alt=""
          className="aspect-video w-full rounded-lg border border-border object-cover"
        />
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <div
        className="prose prose-neutral max-w-none leading-relaxed text-foreground prose-headings:text-foreground prose-a:text-primary dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  )
}
```

Note: this uses Tailwind's `prose` classes for readable typography. If `@tailwindcss/typography` is not installed, skip the `prose*` classes and instead style with plain utility classes for headings/paragraphs/lists (`[&_h2]:text-xl [&_h2]:font-semibold [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3`) — check `package.json` for `@tailwindcss/typography` before choosing.

- [ ] **Step 2: Typecheck and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/article-preview.tsx
git commit -m "feat: add article preview component"
```

---

### Task 6: Shared article form with Tiptap editor

**Files:**
- Create: `src/components/shared/article-form.tsx`

**Interfaces:**
- Consumes: `api.articles.{create,update,publish,unpublish,delete}` (Task 2), `ArticlePreview` (Task 5), `ConfirmDialog` (existing).
- Produces: `ArticleForm({ article }: { article?: Article })` — `article` undefined means create mode, present means edit mode. Consumed by Task 7's `new` and `[id]/edit` pages.

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  ImageIcon,
  Loader2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ArticlePreview } from '@/components/shared/article-preview'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Article } from '@/types/api'

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type ArticleFormValues = z.infer<typeof articleSchema>

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className={cn('size-8', active && 'bg-primary text-primary-foreground')}
    >
      {children}
    </Button>
  )
}

function LinkPopover({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton
            label="Insert link"
            active={editor.isActive('link')}
            onClick={() => setOpen(true)}
          >
            <LinkIcon className="size-4" />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent className="flex w-72 flex-col gap-2">
        <Label htmlFor="link-url">Link URL</Label>
        <Input
          id="link-url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (url) editor.chain().focus().setLink({ href: url }).run()
            setUrl('')
            setOpen(false)
          }}
        >
          Insert
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function ImagePopover({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span>
          <ToolbarButton label="Insert image" onClick={() => setOpen(true)}>
            <ImageIcon className="size-4" />
          </ToolbarButton>
        </span>
      </PopoverTrigger>
      <PopoverContent className="flex w-72 flex-col gap-2">
        <Label htmlFor="image-url">Image URL</Label>
        <Input
          id="image-url"
          type="url"
          placeholder="https://example.com/photo.jpg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (url) editor.chain().focus().setImage({ src: url }).run()
            setUrl('')
            setOpen(false)
          }}
        >
          Insert
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="size-4" />
      </ToolbarButton>
      <LinkPopover editor={editor} />
      <ImagePopover editor={editor} />
    </div>
  )
}

export function ArticleForm({ article }: { article?: Article }) {
  const router = useRouter()
  const isEditing = !!article
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedArticle, setSavedArticle] = useState<Article | null>(article ?? null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'publish' | 'unpublish' | 'delete' | null>(
    null
  )
  const [confirming, setConfirming] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title ?? '',
      coverImageUrl: article?.coverImageUrl ?? '',
    },
  })

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
    ],
    content: article?.contentHtml ?? '',
  })

  const handleSaveDraft = handleSubmit(async (values) => {
    setServerError(null)
    setSaving(true)
    try {
      const contentHtml = editor?.getHTML() ?? ''
      const payload = {
        title: values.title,
        contentHtml,
        coverImageUrl: values.coverImageUrl || undefined,
      }
      const result = savedArticle
        ? await api.articles.update(savedArticle.id, payload)
        : await api.articles.create(payload)
      setSavedArticle(result)
      toast.success('Draft saved')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to save article')
    } finally {
      setSaving(false)
    }
  })

  const handleConfirmedAction = async () => {
    if (!savedArticle || !confirmAction) return
    setConfirming(true)
    try {
      if (confirmAction === 'publish') {
        await api.articles.publish(savedArticle.id)
        toast.success('Article published')
        router.push('/articles')
      } else if (confirmAction === 'unpublish') {
        const updated = await api.articles.unpublish(savedArticle.id)
        setSavedArticle(updated)
        toast.success('Article unpublished')
      } else {
        await api.articles.delete(savedArticle.id)
        toast.success('Article deleted')
        router.push('/articles')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setConfirming(false)
      setConfirmAction(null)
    }
  }

  if (!editor) return null

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Article' : 'New Article'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {savedArticle && (
            <p className="text-sm text-muted-foreground">
              URL: /articles/{savedArticle.slug}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="coverImageUrl">Cover Image URL</Label>
            <Input
              id="coverImageUrl"
              type="url"
              placeholder="Optional"
              {...register('coverImageUrl')}
            />
            {errors.coverImageUrl && (
              <p className="text-sm text-destructive">{errors.coverImageUrl.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Content</Label>
            <div className="rounded-md border border-border">
              <EditorToolbar editor={editor} />
              <EditorContent
                editor={editor}
                className="prose prose-neutral min-h-64 max-w-none p-3 focus-within:outline-none dark:prose-invert [&_.ProseMirror]:min-h-56 [&_.ProseMirror]:outline-none"
              />
            </div>
          </div>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSaveDraft} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!savedArticle}
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </Button>
            {savedArticle?.status === 'PUBLISHED' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction('unpublish')}
              >
                Unpublish
              </Button>
            )}
            {isEditing && (
              <Button type="button" variant="destructive" onClick={() => setConfirmAction('delete')}>
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <ArticlePreview
            title={savedArticle?.title ?? ''}
            coverImageUrl={savedArticle?.coverImageUrl ?? null}
            contentHtml={editor.getHTML()}
          />
          {savedArticle?.status !== 'PUBLISHED' && (
            <Button onClick={() => setConfirmAction('publish')}>Publish</Button>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        title={
          confirmAction === 'publish'
            ? 'Publish this article?'
            : confirmAction === 'unpublish'
              ? 'Unpublish this article?'
              : 'Delete this article?'
        }
        description={
          confirmAction === 'delete'
            ? 'This permanently removes the article. This cannot be undone.'
            : 'This changes the article visibility on the public site.'
        }
        confirmLabel={
          confirmAction === 'publish' ? 'Publish' : confirmAction === 'unpublish' ? 'Unpublish' : 'Delete'
        }
        onConfirm={handleConfirmedAction}
        loading={confirming}
        variant={confirmAction === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors. If `editor.chain().focus().setLink(...)` or `.setImage(...)` type errors appear, confirm `TiptapLink`/`TiptapImage` are included in the `extensions` array (they register those chain methods via TypeScript module augmentation) — this is the standard Tiptap pattern, not a bug to work around.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/article-form.tsx
git commit -m "feat: add shared article form with tiptap editor"
```

---

### Task 7: New and edit article pages

**Files:**
- Create: `src/app/(dashboard)/articles/new/page.tsx`
- Create: `src/app/(dashboard)/articles/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `ArticleForm` (Task 6), `api.articles.get` (Task 2).

- [ ] **Step 1: Write the new-article page**

```tsx
'use client'

import { PageHeader } from '@/components/shared/page-header'
import { ArticleForm } from '@/components/shared/article-form'

export default function NewArticlePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New Article" />
      <ArticleForm />
    </div>
  )
}
```

- [ ] **Step 2: Write the edit-article page**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ArticleForm } from '@/components/shared/article-form'
import { api } from '@/lib/api'
import type { Article } from '@/types/api'

export default function EditArticlePage() {
  const params = useParams<{ id: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api.articles
      .get(params.id)
      .then((data) => {
        if (!cancelled) setArticle(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load article')
        }
      })

    return () => {
      cancelled = true
    }
  }, [params.id])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit Article" />
      {article ? (
        <ArticleForm article={article} />
      ) : (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification — full workflow**

Run: `bun run dev`. Using a `WRITER`-role account (or an account with `role: 'WRITER'` returned from `/admin/auth/login`):
1. Confirm the sidebar shows only Articles / New Article.
2. Navigate to `/users` directly — confirm redirect to `/articles`.
3. Click "New Article", enter a title, add formatted content (heading, bold, bullet list, a link, an image by URL), click "Save Draft" — confirm the slug helper text appears and a toast fires.
4. Click "Preview" — confirm it renders read-only with cover image/content styled per the palette.
5. From preview, click "Publish", confirm the `ConfirmDialog` appears, confirm — confirm redirect to `/articles` and the article now shows status Published.
6. Re-open the article, click "Unpublish", confirm the dialog and status change.
7. Click "Delete", confirm the dialog, confirm redirect back to `/articles` and the article is gone.
8. Log out, log in as an `ADMIN` account — confirm the original sidebar (Dashboard/Users/Devices/Sync/Flagged) is unchanged and `/articles` is still reachable if navigated to directly.

Take screenshots at steps 1, 3 (formatted content visible), 4 (preview), 5 (publish confirm dialog), and the admin sidebar in step 8 — these go in the PR description.

- [ ] **Step 5: Commit**

```bash
git add src/app/"(dashboard)"/articles/new/page.tsx "src/app/(dashboard)/articles/[id]/edit/page.tsx"
git commit -m "feat: add new and edit article pages"
```

---

### Task 8: Open the PR

**Files:** none (git/GitHub operations only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/writer-dashboard
```

- [ ] **Step 2: Open the PR against `main`**

Use `gh pr create` with a body summarizing the role-based dashboard split and article workflow, embedding the screenshots captured in Task 7 Step 4, and noting the manual verification checklist from Task 7 Step 4 as the test plan. Use the repository's PR template if one exists at `.github/pull_request_template.md` or `.github/PULL_REQUEST_TEMPLATE/`.

- [ ] **Step 3: Confirm PR opened**

Run: `gh pr view --web` or report the PR URL back.
