'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  Newspaper,
  FilePlus,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type NavRole = 'ADMIN' | 'WRITER'

const adminNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/devices', label: 'Devices', icon: Smartphone },
  { href: '/sync', label: 'Sync Batches', icon: RefreshCw },
  { href: '/flagged', label: 'Flagged', icon: AlertTriangle },
]

const writerNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/articles', label: 'Articles', icon: Newspaper },
  { href: '/articles/new', label: 'New Article', icon: FilePlus },
]

export function Sidebar({
  role,
  onNavigate,
}: {
  role: NavRole
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const navItems = role === 'WRITER' ? writerNavItems : adminNavItems

  // Nav items can be prefixes of one another (e.g. /articles and /articles/new).
  // A given pathname may match more than one item's href — only the item with
  // the longest (most specific) matching href should be highlighted.
  const matchLength = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? href.length : -1
  const bestMatchLength = Math.max(...navItems.map(({ href }) => matchLength(href)))

  return (
    <nav className="flex h-full w-full flex-col gap-1 p-4">
      <span className="mb-4 px-2 text-lg font-semibold tracking-tight text-primary">
        Dompet Garuda
      </span>
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = matchLength(href) >= 0 && matchLength(href) === bestMatchLength
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
