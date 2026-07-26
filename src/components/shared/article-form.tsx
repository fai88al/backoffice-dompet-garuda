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

type ConfirmAction = 'publish' | 'unpublish' | 'delete'

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
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
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
    extensions: [StarterKit, TiptapLink.configure({ openOnClick: false }), TiptapImage],
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
    setServerError(null)
    try {
      if (confirmAction === 'publish') {
        const updated = await api.articles.publish(savedArticle.id)
        setSavedArticle(updated)
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
      setServerError(err instanceof Error ? err.message : 'Action failed')
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
            <p className="text-sm text-muted-foreground">URL: /articles/{savedArticle.slug}</p>
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
                className={cn(
                  'min-h-64 max-w-none p-3 text-foreground focus-within:outline-none',
                  '[&_.ProseMirror]:min-h-56 [&_.ProseMirror]:outline-none',
                  '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-semibold',
                  '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold',
                  '[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold',
                  '[&_.ProseMirror_p]:my-3',
                  '[&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6',
                  '[&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6',
                  '[&_.ProseMirror_li]:my-1',
                  '[&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic',
                  '[&_.ProseMirror_pre]:my-3 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-3',
                  '[&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-sm',
                  '[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline hover:[&_.ProseMirror_a]:opacity-80',
                  '[&_.ProseMirror_img]:my-3 [&_.ProseMirror_img]:rounded-md [&_.ProseMirror_img]:border [&_.ProseMirror_img]:border-border'
                )}
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
              <Button type="button" variant="outline" onClick={() => setConfirmAction('unpublish')}>
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
          confirmAction === 'publish'
            ? 'Publish'
            : confirmAction === 'unpublish'
              ? 'Unpublish'
              : 'Delete'
        }
        onConfirm={handleConfirmedAction}
        loading={confirming}
        variant={confirmAction === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  )
}
