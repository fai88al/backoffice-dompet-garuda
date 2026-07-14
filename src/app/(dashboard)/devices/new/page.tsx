'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Copy, Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { api } from '@/lib/api'
import type { User, RegisterDeviceResponse } from '@/types/api'

const registerSchema = z.object({
  userId: z.string().min(1, 'Select a user'),
  publicKey: z.string().min(1, 'Public key is required'),
  label: z.string().max(60, 'Max 60 characters').optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function NewDevicePage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [tokenResult, setTokenResult] = useState<RegisterDeviceResponse | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    api.users
      .list()
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setUsersError(err instanceof Error ? err.message : 'Failed to load users')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { label: '' },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    try {
      const result = await api.devices.register({
        userId: values.userId,
        publicKey: values.publicKey,
        label: values.label || undefined,
      })
      setTokenResult(result)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to register device')
    }
  }

  const handleCopy = async () => {
    if (!tokenResult) return
    try {
      await navigator.clipboard.writeText(tokenResult.deviceToken)
      setCopied(true)
    } catch {
      toast.error('Could not copy to clipboard — select and copy the token manually')
    }
  }

  const handleDismiss = () => {
    setTokenResult(null)
    router.push('/devices')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Register Device" />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Device details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="userId">User</Label>
              <Controller
                control={control}
                name="userId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="userId">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.userId} value={user.userId}>
                          {user.fullName} ({user.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.userId && (
                <p className="text-sm text-destructive">{errors.userId.message}</p>
              )}
              {usersError && <p className="text-sm text-destructive">{usersError}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="publicKey">Public Key</Label>
              <Textarea
                id="publicKey"
                rows={4}
                placeholder="Base64-encoded Ed25519 public key"
                {...register('publicKey')}
              />
              {errors.publicKey && (
                <p className="text-sm text-destructive">{errors.publicKey.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="label">Device Label</Label>
              <Input id="label" placeholder="Optional" {...register('label')} />
              {errors.label && (
                <p className="text-sm text-destructive">{errors.label.message}</p>
              )}
            </div>

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Register Device
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => router.push('/devices')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={!!tokenResult}
        onOpenChange={(open) => {
          if (!open) handleDismiss()
        }}
      >
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Device Token</DialogTitle>
            <DialogDescription>
              Provision this token onto the device now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <TriangleAlert className="size-4" />
            <AlertDescription>
              This token is shown only once and cannot be recovered. Store it securely before
              closing this dialog.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3">
            <code className="flex-1 overflow-x-auto break-all font-mono text-xs">
              {tokenResult?.deviceToken}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label="Copy token"
            >
              <Copy className="size-4" />
            </Button>
          </div>
          {copied && <p className="text-sm text-success">Copied to clipboard</p>}

          <DialogFooter>
            <Button onClick={handleDismiss}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
