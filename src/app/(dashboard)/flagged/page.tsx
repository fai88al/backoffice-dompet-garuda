'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { api } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import type { FlaggedTransaction } from '@/types/api'

type FilterMode = 'unresolved' | 'all'
type FlaggedRow = FlaggedTransaction & { resolved: boolean }

export default function FlaggedPage() {
  const [filter, setFilter] = useState<FilterMode>('unresolved')
  const [flags, setFlags] = useState<FlaggedRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingFlag, setPendingFlag] = useState<FlaggedRow | null>(null)
  const [resolving, setResolving] = useState(false)

  const loadFlags = useCallback((): Promise<FlaggedRow[]> => {
    if (filter === 'unresolved') {
      return api.flagged.list(false).then((rows) => rows.map((row) => ({ ...row, resolved: false })))
    }
    // The API's resolved=true filter isn't a strict complement of resolved=false
    // (it can include still-unresolved flags), so merge by flagId and let
    // presence in the resolved=false list be the authoritative "unresolved" signal.
    return Promise.all([api.flagged.list(false), api.flagged.list(true)]).then(
      ([unresolved, resolved]) => {
        const merged = new Map<number, FlaggedRow>()
        for (const row of resolved) {
          merged.set(row.flagId, { ...row, resolved: true })
        }
        for (const row of unresolved) {
          merged.set(row.flagId, { ...row, resolved: false })
        }
        return Array.from(merged.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }
    )
  }, [filter])

  useEffect(() => {
    let cancelled = false

    loadFlags()
      .then((data) => {
        if (!cancelled) {
          setFlags(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load flagged transactions')
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadFlags])

  const handleResolve = async () => {
    if (!pendingFlag) return
    setResolving(true)
    try {
      await api.flagged.resolve(pendingFlag.flagId)
      toast.success('Flag resolved')
      setPendingFlag(null)
      const refreshed = await loadFlags()
      setFlags(refreshed)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve flag')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Flagged Transactions" />

      <div className="inline-flex w-fit rounded-md border border-border bg-card p-1">
        {(['unresolved', 'all'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilter(mode)}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === mode
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={flags ?? []}
            loading={!flags && !error}
            keyField={(row) => row.flagId}
            emptyMessage={filter === 'unresolved' ? 'No unresolved flags' : 'No flagged transactions'}
            columns={[
              { header: 'Flag ID', cell: (row) => row.flagId },
              { header: 'Reason', cell: (row) => <StatusBadge status={row.reason} /> },
              {
                header: 'Detail',
                cell: (row) => (
                  <span className="block max-w-xs truncate" title={row.detail}>
                    {row.detail}
                  </span>
                ),
              },
              {
                header: 'Created At',
                className: 'text-muted-foreground',
                cell: (row) => formatDate(row.createdAt),
              },
              {
                header: 'Resolved',
                cell: (row) => <StatusBadge status={row.resolved ? 'SETTLED' : 'PENDING'} />,
              },
              {
                header: 'Batch ID',
                className: 'font-mono text-xs',
                cell: (row) => (row.batchId ? `${row.batchId.slice(0, 8)}…` : '—'),
              },
              {
                header: 'Certificate ID',
                className: 'font-mono text-xs',
                cell: (row) => (row.certificateId ? `${row.certificateId.slice(0, 8)}…` : '—'),
              },
              {
                header: '',
                cell: (row) =>
                  !row.resolved && (
                    <Button size="sm" variant="outline" onClick={() => setPendingFlag(row)}>
                      Resolve
                    </Button>
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingFlag}
        onOpenChange={(open) => {
          if (!open) setPendingFlag(null)
        }}
        title="Resolve this flagged transaction?"
        description="This marks the flag as resolved and removes it from the unresolved queue."
        confirmLabel="Resolve"
        onConfirm={handleResolve}
        loading={resolving}
      />
    </div>
  )
}
