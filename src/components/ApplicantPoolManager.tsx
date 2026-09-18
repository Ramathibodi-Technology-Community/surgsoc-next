'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string
  user: any
  status: string
  createdAt: string
  submission?: any
}

interface ApplicantPoolManagerProps {
  eventId: string
  applicants: Applicant[]
  participantLimit: number
}

export default function ApplicantPoolManager({
  eventId,
  applicants,
  participantLimit
}: ApplicantPoolManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'applicant' | 'accepted' | 'rejected'>('all')
  const router = useRouter()

  const filteredApplicants = applicants.filter(a =>
    filter === 'all' || a.status === filter
  )

  const acceptedCount = applicants.filter(a => a.status === 'accepted').length
  const pendingCount = applicants.filter(a => a.status === 'applicant').length
  const rejectedCount = applicants.filter(a => a.status === 'rejected').length

  /*
    One row of controls that is also the read-out. "Applicant" is labelled
    Pending, because that is what the status means and what the count answers —
    the raw enum value read as a synonym for "All" sitting next to it.

    Accepted carries the limit, since accepting is the one action on this page
    that the limit can block; the others are just sizes.
  */
  const TABS = [
    { key: 'all' as const, label: 'All', count: String(applicants.length) },
    { key: 'applicant' as const, label: 'Pending', count: String(pendingCount) },
    {
      key: 'accepted' as const,
      label: 'Accepted',
      count: participantLimit > 0 ? `${acceptedCount} / ${participantLimit}` : String(acceptedCount),
    },
    { key: 'rejected' as const, label: 'Rejected', count: String(rejectedCount) },
  ]

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const selectAll = () => {
    setSelected(new Set(filteredApplicants.map(a => a.id)))
  }

  const deselectAll = () => {
    setSelected(new Set())
  }

  const batchAccept = async () => {
    // Check participant limit
    if (participantLimit > 0 && acceptedCount + selected.size > participantLimit) {
      alert(`Cannot accept: would exceed participant limit of ${participantLimit}`)
      return
    }

    if (!confirm(`Are you sure you want to accept ${selected.size} applicants?`)) return

    try {
      const res = await fetch(`/api/events/${eventId}/applicants/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          registrationIds: Array.from(selected),
        }),
      })

      if (!res.ok) throw new Error('Batch operation failed')

      router.refresh()
    } catch (err) {
      alert('Failed to update applicants. Please try again.')
    }
  }

  const batchReject = async () => {
    if (!confirm(`Are you sure you want to REJECT ${selected.size} applicants?`)) return

    try {
      const res = await fetch(`/api/events/${eventId}/applicants/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          registrationIds: Array.from(selected),
        }),
      })

      if (!res.ok) throw new Error('Batch operation failed')

      router.refresh()
    } catch (err) {
      alert('Failed to update applicants. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/*
        The counts live inside the view tabs, not in a row of their own above
        them. They were four stat cards, then four pills — but every number
        except "Selected" was the size of a filter's result set, so the pill and
        the tab beside it were naming the same thing twice. A tab that carries
        its own count answers "how many are pending?" and "show me the pending
        ones" with one control.

        "Selected" was the one number that is not a view, and it is already on
        the Accept/Reject buttons, which is the only place it changes anything.
      */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 md:mx-0 md:px-0 md:pb-0">
          {TABS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                // Border exists (transparent) in both states so the 1px ring that
                // appears on hover doesn't grow the button and shove its siblings —
                // only colour and border-colour are transitioned, never `transition-all`,
                // since that would animate the focus ring in instead of snapping it on.
                className={`inline-flex items-center gap-2 rounded-full border px-[17px] py-2.5 text-[13px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  active
                    ? 'border-transparent bg-accent text-accent-foreground'
                    : 'border-transparent text-secondary-foreground hover:border-border-strong hover:text-foreground'
                }`}
              >
                {f.label}
                {/*
                  The count inherits the tab's colour rather than carrying a
                  status tint of its own. Tinting it would put a second colour
                  inside a control that is already either accent-filled or
                  quiet, and the tab's own state is the thing being signalled.
                */}
                <span
                  className={`tabular-nums ${active ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={selectAll}
            className="rounded-[10px] border border-border-strong px-4 py-2 text-[13px] font-medium whitespace-nowrap outline-none transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="rounded-[10px] border border-border-strong px-4 py-2 text-[13px] font-medium whitespace-nowrap outline-none transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Deselect All
          </button>
          {/*
            design.md: "Disabled does not exist." A greyed-out Accept/Reject told
            the reader they couldn't act without saying why. With nothing
            selected there is nothing to accept, so the buttons are absent
            rather than inert — and because they carry the selection count in
            their own labels, their reappearance *is* the acknowledgement that a
            row was ticked.
          */}
          {selected.size > 0 && (
            <>
              {/*
                Accept fills in `--primary`, the colour every other primary
                button on the site uses. It was `--success`, which is blue and
                means "settled and on record" — a state, not an action. Teal is
                the one that means you can act here.
              */}
              <button
                onClick={batchAccept}
                className="rounded-[10px] bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground whitespace-nowrap outline-none transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Accept ({selected.size})
              </button>
              {/*
                Reject outlines rather than fills. Filled red is reserved for
                irreversible deletion, which this site has none of — a rejection
                is a status a coordinator can set back. Two filled buttons side
                by side also made neither of them the primary one.
              */}
              <button
                onClick={batchReject}
                className="rounded-[10px] border border-destructive/50 px-4 py-2 text-[13px] font-medium text-destructive whitespace-nowrap outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Reject ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Applicant List */}
      <div className="panel overflow-x-auto rounded-[10px]">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="w-12 border-b border-border-strong p-4 text-left">
                <input
                    type="checkbox"
                    className="rounded w-4 h-4"
                    checked={filteredApplicants.length > 0 && selected.size === filteredApplicants.length}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                />
              </th>
              <th className="label-mono whitespace-nowrap border-b border-border-strong p-4 text-left text-muted-foreground">Name</th>
              <th className="label-mono whitespace-nowrap border-b border-border-strong p-4 text-left text-muted-foreground">Email</th>
              <th className="label-mono whitespace-nowrap border-b border-border-strong p-4 text-left text-muted-foreground">Student ID</th>
              <th className="label-mono whitespace-nowrap border-b border-border-strong p-4 text-left text-muted-foreground">Applied At</th>
              <th className="label-mono whitespace-nowrap border-b border-border-strong p-4 text-left text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplicants.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No applicants found in this category.
                    </td>
                </tr>
            ) : (
                filteredApplicants.map((applicant) => (
                  <tr
                    key={applicant.id}
                    className="border-b border-border transition-colors hover:bg-card/60"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.has(applicant.id)}
                        onChange={() => toggleSelect(applicant.id)}
                        className="rounded w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 text-sm">
                      <div className="font-medium">
                          {applicant.user?.name_english?.first_name} {applicant.user?.name_english?.last_name}
                      </div>
                      <div className="meta-mono md:hidden">
                          {applicant.user?.nickname && `(${applicant.user.nickname})`}
                      </div>
                    </td>
                    <td className="meta-mono p-4 [overflow-wrap:anywhere]">{applicant.user?.email}</td>
                    <td className="meta-mono p-4">{applicant.user?.academic?.student_id || '—'}</td>
                    <td className="meta-mono whitespace-nowrap p-4">
                      {new Date(applicant.createdAt).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`label-mono ${
                        applicant.status === 'accepted'
                          ? 'text-success'
                          : applicant.status === 'rejected'
                            ? 'text-destructive'
                            : 'text-warning'
                      }`}>
                        {applicant.status}
                      </span>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
