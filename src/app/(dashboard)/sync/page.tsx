'use client'

import { useEffect, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { SyncBatch } from '@/types/api'

export default function SyncPage() {
  const [batches, setBatches] = useState<SyncBatch[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api.sync
      .list()
      .then((data) => {
        if (!cancelled) setBatches(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sync batches')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sync Batches" />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={batches ?? []}
            loading={!batches && !error}
            keyField={(row) => row.batchId}
            emptyMessage="No sync batches yet"
            columns={[
              {
                header: 'Batch ID',
                className: 'font-mono text-xs',
                cell: (row) => `${row.batchId.slice(0, 8)}…`,
              },
              {
                header: 'Device ID',
                className: 'font-mono text-xs',
                cell: (row) => `${row.deviceId.slice(0, 8)}…`,
              },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Synced After Expiry',
                cell: (row) => (row.syncedAfterExpiry ? 'Yes' : 'No'),
              },
              {
                header: 'Received At',
                className: 'text-muted-foreground',
                cell: (row) => formatDate(row.receivedAt),
              },
              {
                header: 'Processed At',
                className: 'text-muted-foreground',
                cell: (row) => (row.processedAt ? formatDate(row.processedAt) : '—'),
              },
              {
                header: 'Error Reason',
                cell: (row) =>
                  row.errorReason ? (
                    <span className="block max-w-xs truncate text-destructive" title={row.errorReason}>
                      {row.errorReason}
                    </span>
                  ) : (
                    '—'
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
