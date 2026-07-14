'use client'

import { Menu, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function Topbar({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <Sidebar />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium text-muted-foreground">Admin</span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Log out" onClick={onLogout}>
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  )
}
