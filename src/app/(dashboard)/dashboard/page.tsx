'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, Smartphone, ShieldCheck, AlertTriangle, type LucideIcon } from 'lucide-react'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { AnalyticsOverview, FlaggedTransaction, SyncBatch } from '@/types/api'

type DateRangePreset = '7d' | '30d' | 'custom'

// Fixed palette, one color per transaction type series — recharts needs a stable
// key->color mapping so lines/slices don't reshuffle color as data changes.
const TYPE_COLORS: Record<string, string> = {
  ONLINE_TRANSFER: '#5d7066',
  OFFLINE_TRANSFER: '#d9c6b0',
  QR_PAYMENT_ONLINE: '#7a9e8a',
  TOPUP: '#3b82f6',
  POUCH_LOAD: '#a855f7',
  POUCH_REFUND: '#d97706',
}
const FALLBACK_TYPE_COLOR = '#9ca3af'

function colorForType(type: string) {
  return TYPE_COLORS[type] ?? FALLBACK_TYPE_COLOR
}

// Mirrors StatusBadge's color mapping (§9) so the analytics section stays
// visually consistent with status badges used elsewhere on this page.
const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'var(--success)',
  PENDING: 'var(--warning)',
  FAILED: 'var(--destructive)',
  REVERSED: 'var(--muted-foreground)',
}

function toIsoInstant(date: Date) {
  return date.toISOString()
}

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

  const [preset, setPreset] = useState<DateRangePreset>('7d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  const range = useMemo(() => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return null
      return { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() }
    }
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - (preset === '30d' ? 30 : 7))
    return { from: toIsoInstant(from), to: toIsoInstant(to) }
  }, [preset, customFrom, customTo])

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

  useEffect(() => {
    if (!range) return
    let cancelled = false

    api.analytics
      .overview(range.from, range.to)
      .then((result) => {
        if (!cancelled) {
          setAnalytics(result)
          setAnalyticsError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics')
        }
      })

    return () => {
      cancelled = true
    }
  }, [range])

  const dailyVolumeChartData = useMemo(() => {
    if (!analytics) return []
    const byDate = new Map<string, Record<string, number | string>>()
    for (const entry of analytics.dailyVolume) {
      const row = byDate.get(entry.date) ?? { date: entry.date }
      row[entry.type] = entry.count
      byDate.set(entry.date, row)
    }
    return [...byDate.values()].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    )
  }, [analytics])

  const dailyVolumeTypes = useMemo(
    () => [...new Set(analytics?.dailyVolume.map((e) => e.type) ?? [])],
    [analytics]
  )

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

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-range" className="text-xs text-muted-foreground">
                Range
              </Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
                <SelectTrigger id="analytics-range" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="analytics-from" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="analytics-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="analytics-to" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="analytics-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {analyticsError && (
          <Alert variant="destructive">
            <AlertDescription>{analyticsError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics && !analyticsError ? (
                <Skeleton className="h-64 w-full" />
              ) : dailyVolumeChartData.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No data for this range</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyVolumeChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {dailyVolumeTypes.map((type) => (
                      <Line
                        key={type}
                        type="monotone"
                        dataKey={type}
                        stroke={colorForType(type)}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {!analytics && !analyticsError ? (
                <Skeleton className="h-64 w-full" />
              ) : (analytics?.typeDistribution.length ?? 0) === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">No data for this range</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={analytics?.typeDistribution}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {analytics?.typeDistribution.map((entry) => (
                        <Cell key={entry.type} fill={colorForType(entry.type)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status Counts</CardTitle>
          </CardHeader>
          <CardContent>
            {!analytics && !analyticsError ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex flex-col gap-3">
                {(['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'] as const).map((status) => {
                  const count = analytics?.statusCounts[status] ?? 0
                  const max = Math.max(
                    1,
                    ...(['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'] as const).map(
                      (s) => analytics?.statusCounts[s] ?? 0
                    )
                  )
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-28 shrink-0">
                        <StatusBadge status={status} />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / max) * 100}%`,
                            backgroundColor: STATUS_COLORS[status],
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Active users — as of now, not scoped to the selected range</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(
              [
                { key: 'daily', label: 'Daily Active' },
                { key: 'sevenDay', label: '7-Day Active' },
                { key: 'thirtyDay', label: '30-Day Active' },
              ] as const
            ).map(({ key, label }) => (
              <Card key={key}>
                <CardContent className="pt-6">
                  {analytics ? (
                    <p className="text-2xl font-semibold leading-none">
                      {analytics.activeUsers[key]}
                    </p>
                  ) : (
                    <Skeleton className="h-7 w-10" />
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Device status — as of now, not scoped to the selected range</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(['ACTIVE', 'SUSPENDED', 'LOCKED'] as const).map((status) => (
              <Card key={status}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    {analytics ? (
                      <p className="text-2xl font-semibold leading-none">
                        {analytics.deviceStatus[status] ?? 0}
                      </p>
                    ) : (
                      <Skeleton className="h-7 w-10" />
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{status}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
