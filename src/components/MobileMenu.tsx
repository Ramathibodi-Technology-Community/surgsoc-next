'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { navLinks, isActiveSection } from './HeaderNav'
import { LanguageToggle } from './LanguageToggle'
import { cn } from '@/libs/utils'

export default function MobileMenu({ enableI18n = false }: { enableI18n?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="flex cursor-pointer flex-col gap-1 rounded-[10px] border border-border-strong p-2.5 md:hidden"
      >
        <span className="h-[1.5px] w-4 bg-secondary-foreground" />
        <span className="h-[1.5px] w-4 bg-secondary-foreground" />
        <span className="h-[1.5px] w-4 bg-secondary-foreground" />
      </SheetTrigger>
      {/* The nav needs no description beyond its title; tell Radix so rather
          than leaving it to warn about a missing one. */}
      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="w-[300px] gap-0 border-border bg-surface p-0"
      >
        <div className="flex h-[60px] items-center justify-between gap-3 border-b border-border-strong px-4">
          <SheetTitle className="label-mono text-muted-foreground">Menu</SheetTitle>
        </div>
        <nav className="flex flex-col">
          {navLinks.map((link) => {
            const active = isActiveSection(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center justify-between border-b border-border px-4 py-[18px] text-lg leading-none transition-colors',
                  active ? 'bg-accent/10 text-foreground' : 'text-secondary-foreground active:bg-secondary/50',
                )}
              >
                {link.label}
                <span className={cn('text-lg', active ? 'text-accent' : 'text-muted-foreground')}>›</span>
              </Link>
            )
          })}
        </nav>

        {/*
          Below sm the header bar has no room for the language toggle, so it
          lives here instead. `sm:hidden` keeps it from appearing twice in the
          640–768 band, where the bar shows it and this sheet still opens.
          `mt-auto` anchors it to the bottom of the sheet instead of leaving a
          slab of empty space between it and the short link list above.
        */}
        {enableI18n && (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-4 py-[18px] sm:hidden">
            <span className="label-mono text-muted-foreground">Language</span>
            <LanguageToggle />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
