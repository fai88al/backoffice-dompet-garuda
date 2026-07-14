'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Device, DeviceStatus } from '@/types/api'

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

const statusActions: {
  status: DeviceStatus
  label: string
  variant: 'default' | 'destructive'
}[] = [
  { status: 'ACTIVE', label: 'Activate', variant: 'default' },
  { status: 'SUSPENDED', label: 'Suspend', variant: 'destructive' },
  { status: 'LOCKED', label: 'Lock', variant: 'destructive' },
]

function statusVerb(status: DeviceStatus) {
  if (status === 'ACTIVE') return 'activated'
  if (status === 'SUSPENDED') return 'suspended'
  return 'locked'
}

export default function DeviceDetailPage() {
  const params = useParams<{ deviceId: string }>()
  const deviceId = params.deviceId

  const [device, setDevice] = useState<Device | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<DeviceStatus | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadDevice = useCallback(() => {
    return api.devices.list().then((devices) => {
      const found = devices.find((d) => d.deviceId === deviceId)
      if (!found) throw new Error('Device not found')
      return found
    })
  }, [deviceId])

  useEffect(() => {
    let cancelled = false

    loadDevice()
      .then((data) => {
        if (!cancelled) setDevice(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load device')
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadDevice])

  const handleConfirmStatus = async () => {
    if (!pendingStatus) return
    setUpdating(true)
    try {
      await api.devices.updateStatus(deviceId, pendingStatus)
      toast.success(`Device ${statusVerb(pendingStatus)}`)
      const refreshed = await loadDevice()
      setDevice(refreshed)
      setPendingStatus(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update device status')
    } finally {
      setUpdating(false)
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
      <PageHeader
        title={device ? `Device ${device.deviceId.slice(0, 8)}…` : 'Device'}
        description={device?.userPhone}
      />

      <Card>
        <CardHeader>
          <CardTitle>Device Info</CardTitle>
        </CardHeader>
        <CardContent>
          {device ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Device ID" value={device.deviceId} mono />
              <InfoItem label="User ID" value={device.userId} mono />
              <InfoItem label="User Phone" value={device.userPhone} />
              <InfoItem label="Status" value={<StatusBadge status={device.status} />} />
              <InfoItem label="Last Counter" value={String(device.lastCounter)} />
              <InfoItem label="Registered At" value={formatDate(device.registeredAt)} />
            </dl>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {device?.activeCertificate && (
        <Card>
          <CardHeader>
            <CardTitle>Active Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Certificate ID" value={device.activeCertificate.certificateId} mono />
              <InfoItem
                label="Issued Amount"
                value={formatCurrency(device.activeCertificate.issuedAmount)}
              />
              <InfoItem
                label="Status"
                value={<StatusBadge status={device.activeCertificate.status} />}
              />
              <InfoItem label="Expires At" value={formatDate(device.activeCertificate.expiresAt)} />
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusActions.map(({ status, label, variant }) => (
              <Button
                key={status}
                variant={variant}
                disabled={!device || device.status === status}
                onClick={() => setPendingStatus(status)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingStatus}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null)
        }}
        title={pendingStatus ? `${statusActions.find((a) => a.status === pendingStatus)?.label} this device?` : ''}
        description="This changes the device's status immediately and affects its ability to transact."
        confirmLabel="Confirm"
        onConfirm={handleConfirmStatus}
        loading={updating}
        variant={pendingStatus === 'ACTIVE' ? 'default' : 'destructive'}
      />
    </div>
  )
}
