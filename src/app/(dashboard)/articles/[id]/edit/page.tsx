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
