'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { confirmAttendance, declineAttendance } from './actions'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

/**
 * The accept/decline pair, shown only while a place is being held for you.
 *
 * One filled button and one outlined one: these are not two options to choose
 * between on equal terms, they are the action and the way out. Both are
 * full-width because they live in a 300px sticky aside, where side-by-side
 * would give each about 130px and wrap the labels to two lines.
 *
 * In-flight is a *loading* state, not the banned disabled one: the label stays,
 * a spinner appears, and the reason is on screen. The `disabled` attribute is
 * carried there deliberately — a handler-side `if (loading) return` reads a
 * stale closure on a fast double-click, and the cost of getting that wrong is a
 * duplicate registration, not a cosmetic glitch. What the design forbids is a
 * greyed control standing in for an action it has removed; that case renders no
 * button at all, over in the page's aside.
 */
export default function EventActions({
  eventId,
  primaryAction,
  secondaryAction,
}: {
  eventId: string
  primaryAction: { label: string; kind: string }
  secondaryAction?: { label: string; kind: string; href?: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState('')

  const handleConfirm = async () => {
    if (loading) return
    setLoading('confirm')
    await confirmAttendance(eventId)
    router.refresh()
    setLoading('')
  }

  const handleDecline = async () => {
    if (loading) return
    setLoading('decline')
    await declineAttendance(eventId)
    router.refresh()
    setLoading('')
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        onClick={handleConfirm}
        className="h-auto w-full py-[15px] text-[15px]"
        disabled={!!loading}
        aria-busy={loading === 'confirm'}
      >
        {loading === 'confirm' && <Loader2 className="animate-spin" aria-hidden="true" />}
        {primaryAction.label}
      </Button>

      {secondaryAction &&
        /* A decline that routes to an LOA form is navigation, not the action
           itself — so it is a link, and carries no spinner or busy state. */
        (secondaryAction.href ? (
          <Button asChild variant="outline" className="h-auto w-full py-3 text-[15px]">
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        ) : (
          <Button
            onClick={handleDecline}
            variant="outline"
            className="h-auto w-full py-3 text-[15px]"
            disabled={!!loading}
            aria-busy={loading === 'decline'}
          >
            {loading === 'decline' && <Loader2 className="animate-spin" aria-hidden="true" />}
            {secondaryAction.label}
          </Button>
        ))}
    </div>
  )
}
