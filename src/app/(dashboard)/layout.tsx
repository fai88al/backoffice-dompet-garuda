'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { isAuthenticated, clearAuth, getRole } from '@/lib/auth'

type Role = 'ADMIN' | 'WRITER'

function isValidRole(role: string | null): role is Role {
  return role === 'ADMIN' || role === 'WRITER'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    const storedRole = getRole()
    if (!isValidRole(storedRole)) {
      clearAuth()
      router.replace('/login')
      return
    }
    if (storedRole === 'WRITER' && !(pathname === '/articles' || pathname.startsWith('/articles/'))) {
      router.replace('/articles')
      return
    }
    // One-time client auth/role gate on mount — not a derived-state loop, so the
    // set-state-in-effect lint rule doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(storedRole)
  }, [router, pathname])

  const handleLogout = () => {
    clearAuth()
    router.replace('/login')
  }

  if (!role) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <Sidebar role={role} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
