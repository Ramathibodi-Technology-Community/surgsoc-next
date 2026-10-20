'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { confirmAttendance, declineAttendance, withdrawApplication } from '@/app/[locale]/(frontend)/events/[id]/actions'

type Kind = 'confirm' | 'leave' | 'withdraw'

/* One member action on one session. Leaving a held place or an application asks first; confirming does not. */
export default function SessionButton({ dayId, kind, label, title, keep, outline = true }: { dayId: number; kind: Kind; label: string; title?: string; keep?: string; outline?: boolean }) {
  const router = useRouter()
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async () => {
    setBusy(true); setError('')
    try {
      const id = String(dayId)
      const result = kind === 'confirm' ? await confirmAttendance(id) : kind === 'leave' ? await declineAttendance(id) : await withdrawApplication(id)
      if (!result.success) setError(result.message)
      else { setAsk(false); router.refresh() }
    } catch { setError('Please try again.') }
    setBusy(false)
  }
  return (
    <>
      <Button variant={outline ? 'outline' : 'default'} pending={busy} onClick={() => (kind === 'confirm' ? run() : setAsk(true))}>{label}</Button>
      {error && <span role="alert" className="text-meta text-destructive">{error}</span>}
      <ConfirmDialog open={ask} onOpenChange={setAsk} title={title ?? label} description="" action={label} keep={keep ?? '—'} destructive pending={busy} onConfirm={run} />
    </>
  )
}
