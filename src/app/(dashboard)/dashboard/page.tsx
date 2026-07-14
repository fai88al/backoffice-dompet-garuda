'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Smartphone, ShieldCheck, AlertTriangle, type LucideIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { FlaggedTransaction, SyncBatch } from '@/types/api'

interface DashboardData {
  userCount: number
  deviceCount: number
  activeCertCount: number
  unresolvedFlagCount: number
  recentFlags: FlaggedTransaction[]
  recentBatches: SyncBatch[]
}

const stats: { key: keyof Pick<DashboardData, 'userCount' | 'deviceCount' | 'activeCertCount' | 'unresolvedFlagCount'>; label: string; icon: LucideIcon }[] = [
  { key: 'userCount', label: 'Total Users', icon: Users },
  { key: 'deviceCount', label: 'Total Devices', icon: Smartphone },
  { key: 'activeCertCount', label: 'Active Certificates', icon: ShieldCheck },
  { key: 'unresolvedFlagCount', label: 'Unresolved Flags', icon: AlertTriangle },
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [users, devices, certificates, flags, batches] = await Promise.all([
          api.users.list(),
          api.devices.list(),
          api.certificates.list('ACTIVE'),
          api.flagged.list(false),
          api.sync.list(),
        ])

        if (cancelled) return

        setData({
          userCount: users.length,
          deviceCount: devices.length,
          activeCertCount: certificates.length,
          unresolvedFlagCount: flags.length,
          recentFlags: [...flags]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5),
          recentBatches: [...batches]
            .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
            .slice(0, 5),
        })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                {data ? (
                  <p className="text-2xl font-semibold leading-none">{data[key]}</p>
                ) : (
                  <Skeleton className="h-7 w-10" />
                )}
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Flagged Transactions</CardTitle>
          <Button variant="link" size="sm" asChild className="h-auto p-0">
            <Link href="/flagged">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.recentFlags ?? []}
            loading={!data && !error}
            keyField={(row) => row.flagId}
            emptyMessage="No flagged transactions"
            columns={[
              { header: 'Reason', cell: (row) => <StatusBadge status={row.reason} /> },
              {
                header: 'Detail',
                cell: (row) => (
                  <span className="block max-w-xs truncate" title={row.detail}>
                    {row.detail}
                  </span>
                ),
              },
              { header: 'Created At', cell: (row) => formatDate(row.createdAt) },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Sync Batches</CardTitle>
          <Button variant="link" size="sm" asChild className="h-auto p-0">
            <Link href="/sync">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.recentBatches ?? []}
            loading={!data && !error}
            keyField={(row) => row.batchId}
            emptyMessage="No sync batches"
            columns={[
              {
                header: 'Batch ID',
                cell: (row) => (
                  <span className="font-mono text-xs">{row.batchId.slice(0, 8)}…</span>
                ),
              },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              { header: 'Received At', cell: (row) => formatDate(row.receivedAt) },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
