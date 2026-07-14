'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable } from '@/components/shared/data-table'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { User } from '@/types/api'

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

      <DataTable
        data={users ?? []}
        loading={!users && !error}
        keyField={(row) => row.userId}
        emptyMessage="No users yet"
        onRowClick={(row) => router.push(`/users/${row.userId}`)}
        columns={[
          { header: 'Full Name', cell: (row) => row.fullName },
          { header: 'Phone', cell: (row) => row.phone },
          { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
          { header: 'Online Balance', cell: (row) => formatCurrency(row.onlineBalance) },
          { header: 'Device Count', cell: (row) => row.deviceCount },
          { header: 'Created At', cell: (row) => formatDate(row.createdAt) },
        ]}
      />
    </div>
  )
}
