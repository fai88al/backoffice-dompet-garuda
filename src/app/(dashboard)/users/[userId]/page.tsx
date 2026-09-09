'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { UserDetail, TransactionHistoryItem, TransactionType } from '@/types/api'

const TRANSACTION_TYPES: TransactionType[] = [
  'ONLINE_TRANSFER',
  'OFFLINE_TRANSFER',
  'QR_PAYMENT_ONLINE',
  'TOPUP',
  'POUCH_LOAD',
  'POUCH_REFUND',
]

const topUpSchema = z.object({
  amount: z.coerce
    .number({ error: 'Amount is required' })
    .int('Amount must be a whole number')
    .min(1000, 'Minimum top-up is Rp1,000'),
  reference: z.string().optional(),
})

type TopUpFormInput = z.input<typeof topUpSchema>
type TopUpFormValues = z.output<typeof topUpSchema>

function InfoItem({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm font-medium'}>{value}</dd>
    </div>
  )
}

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>()
  const userId = params.userId

  const [user, setUser] = useState<UserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [topUpError, setTopUpError] = useState<string | null>(null)

  const [txPage, setTxPage] = useState<{ content: TransactionHistoryItem[]; page: number; totalPages: number } | null>(null)
  const [txLoading, setTxLoading] = useState(true)
  const [txError, setTxError] = useState<string | null>(null)
  const [txType, setTxType] = useState<string>('')
  const [txFrom, setTxFrom] = useState('')
  const [txTo, setTxTo] = useState('')
  const [txPageIndex, setTxPageIndex] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TopUpFormInput, unknown, TopUpFormValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: { reference: '' },
  })

  useEffect(() => {
    let cancelled = false

    api.users
      .get(userId)
      .then((data) => {
        if (!cancelled) setUser(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load user')
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false

    api.transactions
      .listForUser(userId, {
        type: txType || undefined,
        from: txFrom || undefined,
        to: txTo || undefined,
        page: txPageIndex,
      })
      .then((data) => {
        if (!cancelled) {
          setTxPage(data)
          setTxError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTxError(err instanceof Error ? err.message : 'Failed to load transactions')
        }
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, txType, txFrom, txTo, txPageIndex])

  const onTopUp = async (values: TopUpFormValues) => {
    setTopUpError(null)
    try {
      const result = await api.users.topUp(userId, {
        amount: values.amount,
        reference: values.reference ?? '',
      })
      setUser((prev) => (prev ? { ...prev, onlineBalance: result.onlineBalance } : prev))
      toast.success('Top-up successful')
      reset()
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'Top-up failed')
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={user ? user.fullName : 'User'} description={user?.phone} />

      <Card>
        <CardHeader>
          <CardTitle>User Info</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="User ID" value={user.userId} mono />
              <InfoItem label="Status" value={<StatusBadge status={user.status} />} />
              <InfoItem label="Created At" value={formatDate(user.createdAt)} />
              <InfoItem label="Online Balance" value={formatCurrency(user.onlineBalance)} />
              <InfoItem label="Device Count" value={String(user.deviceCount)} />
            </dl>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Up Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onTopUp)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Amount (Rp)</Label>
                <Input id="amount" type="number" min={1000} step={1} {...register('amount')} />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" placeholder="Optional" {...register('reference')} />
              </div>
            </div>

            {topUpError && (
              <Alert variant="destructive">
                <AlertDescription>{topUpError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting || !user} className="self-start">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Top Up
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={user?.devices ?? []}
            loading={!user && !error}
            keyField={(row) => row.deviceId}
            emptyMessage="No devices registered"
            columns={[
              {
                header: 'Device ID',
                cell: (row) => (
                  <Link
                    href={`/devices/${row.deviceId}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {row.deviceId.slice(0, 8)}…
                  </Link>
                ),
              },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              { header: 'Registered At', cell: (row) => formatDate(row.registeredAt) },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tx-type">Type</Label>
              <Select
                value={txType || 'ALL'}
                onValueChange={(value) => {
                  setTxType(value === 'ALL' ? '' : value)
                  setTxPageIndex(0)
                  setTxLoading(true)
                }}
              >
                <SelectTrigger id="tx-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tx-from">From</Label>
              <Input
                id="tx-from"
                type="date"
                value={txFrom}
                onChange={(e) => {
                  setTxFrom(e.target.value)
                  setTxPageIndex(0)
                  setTxLoading(true)
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tx-to">To</Label>
              <Input
                id="tx-to"
                type="date"
                value={txTo}
                onChange={(e) => {
                  setTxTo(e.target.value)
                  setTxPageIndex(0)
                  setTxLoading(true)
                }}
              />
            </div>
          </div>

          {txError && (
            <Alert variant="destructive">
              <AlertDescription>{txError}</AlertDescription>
            </Alert>
          )}

          <DataTable
            data={txPage?.content ?? []}
            loading={txLoading}
            keyField={(row) => row.transactionId ?? row.referenceId}
            emptyMessage="No transactions found"
            columns={[
              { header: 'Date', cell: (row) => formatDate(row.createdAt) },
              { header: 'Type', cell: (row) => row.type },
              { header: 'Direction', cell: (row) => row.direction },
              {
                header: 'Amount',
                cell: (row) => (
                  <span
                    className={cn(
                      row.direction === 'DEBIT' ? 'text-destructive' : 'text-success'
                    )}
                  >
                    {formatCurrency(row.amount)}
                  </span>
                ),
              },
              { header: 'Counterparty', cell: (row) => row.counterparty },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Reference',
                cell: (row) => <span className="font-mono text-xs">{row.referenceId}</span>,
              },
            ]}
          />

          {txPage && txPage.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {txPage.page + 1} of {txPage.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txPageIndex === 0}
                  onClick={() => {
                    setTxPageIndex((p) => Math.max(0, p - 1))
                    setTxLoading(true)
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={txPageIndex >= txPage.totalPages - 1}
                  onClick={() => {
                    setTxPageIndex((p) => p + 1)
                    setTxLoading(true)
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
