'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { isAuthenticated, clearAuth } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    // One-time client auth gate on mount — not a derived-state loop, so the
    // set-state-in-effect lint rule doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthed(true)
  }, [router])

  const handleLogout = () => {
    clearAuth()
    router.replace('/login')
  }

  if (!authed) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onLogout={handleLogout} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
