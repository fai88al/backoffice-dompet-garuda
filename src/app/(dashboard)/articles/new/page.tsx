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
