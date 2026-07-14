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
import type { Device } from '@/types/api'

export default function DevicesPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api.devices
      .list()
      .then((data) => {
        if (!cancelled) setDevices(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load devices')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Devices"
        action={
          <Button asChild>
            <Link href="/devices/new">Register Device</Link>
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
            data={devices ?? []}
            loading={!devices && !error}
            keyField={(row) => row.deviceId}
            emptyMessage="No devices yet"
            onRowClick={(row) => router.push(`/devices/${row.deviceId}`)}
            columns={[
              {
                header: 'Device ID',
                className: 'font-mono text-xs',
                cell: (row) => `${row.deviceId.slice(0, 8)}…`,
              },
              { header: 'User Phone', cell: (row) => row.userPhone },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Last Counter',
                className: 'tabular-nums',
                cell: (row) => row.lastCounter,
              },
              {
                header: 'Registered At',
                className: 'text-muted-foreground',
                cell: (row) => formatDate(row.registeredAt),
              },
              {
                header: 'Active Certificate',
                cell: (row) =>
                  row.activeCertificate ? formatCurrency(row.activeCertificate.issuedAmount) : 'None',
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
