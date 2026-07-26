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
