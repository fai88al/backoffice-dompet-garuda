import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

interface DataTableColumn<T> {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

// Reusable table wrapper with built-in loading/empty states.
export function DataTable<T>({
  columns,
  data,
  keyField,
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'No data',
  onRowClick,
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  keyField: (row: T) => string | number
  loading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  onRowClick?: (row: T) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.header} className={cn('px-4', col.headerClassName)}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: skeletonRows }).map((_, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.header} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="px-4 py-3">
              <EmptyState title={emptyMessage} />
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow
              key={keyField(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <TableCell key={col.header} className={cn('px-4 py-3', col.className)}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
