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

  return (
    <nav className="flex h-full w-full flex-col gap-1 p-4">
      <span className="mb-4 px-2 text-lg font-semibold tracking-tight text-primary">
        Dompet Digital
      </span>
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
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
