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
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { UserDetail } from '@/types/api'

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
    </div>
  )
}
