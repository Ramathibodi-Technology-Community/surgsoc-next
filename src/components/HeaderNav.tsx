'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { locales } from '@/i18n/config'
import { cn } from '@/libs/utils'

const LOCALE_PREFIX = new RegExp(`^/(${locales.join('|')})(?=/|$)`)

// Single source of truth for the primary nav. MobileMenu renders the same list,
// so a link added here appears in the drawer too.
export const navLinks = [
  { href: '/events', label: 'Events' },
  { href: '/forms', label: 'Forms' },
  { href: '/attendings', label: 'Advisors' },
  { href: '/team', label: 'Team' },
]

/**
 * True for the section, not just the exact page — /events/3/apply still lights
 * up "Events". Anchoring on a trailing slash stops /team matching /teams.
 */
export function isActiveSection(pathname: string, href: string) {
  const path = pathname.replace(LOCALE_PREFIX, '') || '/'
  return path === href || path.startsWith(`${href}/`)
}

export default function HeaderNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-1.5">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActiveSection(pathname, link.href) ? 'page' : undefined}
          className={cn(
            'rounded-full px-[17px] py-2.5 text-[13px] font-medium leading-none transition-colors',
            isActiveSection(pathname, link.href)
              ? 'bg-accent text-accent-foreground'
              : 'text-secondary-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
