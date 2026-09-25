import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GENERAL_STATUS_LABELS } from '@/lib/labels'

// Reusable badge for ACTIVE/SUSPENDED/FLAGGED/SETTLED etc. — color mapping per CLAUDE.md §9.
const statusStyles: Record<string, string> = {
  ACTIVE: 'border-success/30 bg-success/15 text-success',
  SETTLED: 'border-success/30 bg-success/15 text-success',
  DONE: 'border-success/30 bg-success/15 text-success',
  PUBLISHED: 'border-success/30 bg-success/15 text-success',
  SUCCESS: 'border-success/30 bg-success/15 text-success',
  SUSPENDED: 'border-destructive/30 bg-destructive/15 text-destructive',
  FLAGGED: 'border-destructive/30 bg-destructive/15 text-destructive',
  FAILED: 'border-destructive/30 bg-destructive/15 text-destructive',
  LOCKED: 'border-warning/30 bg-warning/15 text-warning',
  PENDING: 'border-warning/30 bg-warning/15 text-warning',
  PROCESSING: 'border-warning/30 bg-warning/15 text-warning',
  EXPIRED: 'border-border bg-muted text-muted-foreground',
  // Explicitly mapped (not left to the unmapped default) so DRAFT, EXPIRED, and
  // REVERSED are documented as the same muted/gray treatment on purpose.
  DRAFT: 'border-border bg-muted text-muted-foreground',
  REVERSED: 'border-border bg-muted text-muted-foreground',
}

function formatLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const style = statusStyles[status] ?? 'border-border bg-muted text-muted-foreground'
  return (
    <Badge variant="outline" className={cn('font-normal whitespace-nowrap', style)}>
      {label ?? GENERAL_STATUS_LABELS[status] ?? formatLabel(status)}
    </Badge>
  )
}
