import React from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/*
  The one piece of the header that depends on who is asking.

  It lives in its own file because `headers()` is contagious: reading it
  anywhere under a route opts that whole route out of static generation, and
  the header sits in the root layout, so a single `payload.auth()` call here
  was making all 30 routes render per-visitor. Behind a <Suspense> boundary
  the rest of the page prerenders and streams immediately, and only this
  fragment waits on the session lookup.
*/
export default async function HeaderAuth() {
  // `headers()` already makes this fragment request-time, but Payload's own
  // auth check calls `new Date()` internally — a literal, non-API time read
  // that cacheComponents can't tell apart from a value meant to be baked into
  // the static shell. `connection()` marks the boundary explicitly so build
  // doesn't try to prerender past it.
  await connection()
  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">Sign in</Link>
      </Button>
    )
  }

  const displayName = user.name_english?.first_name || user.email?.split('@')[0] || 'Account'
  const initial = (user.name_english?.first_name || user.email || '?').charAt(0).toUpperCase()

  return (
    // Radix's default `modal` scroll-lock sets `overflow: hidden` on <body>.
    // Since <header> is a sticky direct child of <body> and <html> is the
    // scrolling element, that turns <body> into a second, unscrolled sticky
    // containing block: the header snaps back to its unstuck document
    // position while the viewport is still scrolled, so it vanishes off the
    // top of the screen. This menu needs no focus trap or scroll lock, so
    // non-modal avoids the conflict entirely.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2.5 outline-none">
        <span className="hidden text-[13px] leading-none text-secondary-foreground sm:inline">
          {displayName}
        </span>
        <Avatar className="h-[34px] w-[34px] bg-primary">
          <AvatarImage src={user.image_url || ''} alt={user.email} />
          <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">My Account</Link>
        </DropdownMenuItem>
        {user.roles?.some((role) => ['admin', 'superadmin', 'vp', 'deputy_vp'].includes(role)) && (
          <DropdownMenuItem asChild>
            <Link href="/admin">Admin Panel</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/logout" className="text-destructive focus:text-destructive">
            Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/*
  Held in place while the session resolves. Sized to the signed-in avatar
  (34px) so the bar does not reflow when the real control arrives.

  Deliberately neutral rather than a "Sign in" button: most visitors are
  signed out, so rendering the button would be right more often — but it
  would also briefly tell a signed-in member they are signed out, which is
  the one wrong answer worth avoiding.
*/
export function HeaderAuthFallback() {
  return <div className="h-[34px] w-[34px] shrink-0 animate-pulse rounded-full bg-muted" />
}
