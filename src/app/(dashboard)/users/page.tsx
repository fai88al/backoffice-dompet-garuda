'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { User } from '@/types/api'

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]]
  return initials.map((part) => part.charAt(0).toUpperCase()).join('')
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api.users
      .list()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load users')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        action={
          <Button asChild>
            <Link href="/users/new">Create User</Link>
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={users ?? []}
            loading={!users && !error}
            keyField={(row) => row.userId}
            emptyMessage="No users yet"
            onRowClick={(row) => router.push(`/users/${row.userId}`)}
            columns={[
              {
                header: 'Full Name',
                cell: (row) => (
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(row.fullName)}
                    </div>
                    <span className="font-medium">{row.fullName}</span>
                  </div>
                ),
              },
              {
                header: 'Phone',
                className: 'text-muted-foreground',
                cell: (row) => row.phone,
              },
              {
                header: 'Status',
                cell: (row) => <StatusBadge status={row.status} />,
              },
              {
                header: 'Online Balance',
                className: 'font-medium tabular-nums',
                cell: (row) => formatCurrency(row.onlineBalance),
              },
              {
                header: 'Device Count',
                cell: (row) => (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {row.deviceCount}
                  </span>
                ),
              },
              {
                header: 'Created At',
                className: 'text-muted-foreground',
                cell: (row) => formatDate(row.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
