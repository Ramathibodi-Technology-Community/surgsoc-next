'use client'

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth, useConfig, useDocumentInfo } from '@payloadcms/ui'
import { BATCHABLE_STATUSES, SEATED_STATUSES } from '@/libs/applicant-status'
import { hasPermission } from '@/libs/permissions'
import type { User } from '@/payload-types'
import styles from './EventApplicantsTab.module.css'

type Applicant = {
  id: string
  user: { name_english?: { first_name?: string; last_name?: string }; email?: string; academic?: { student_id?: string } } | string
  status: string
  createdAt: string
  submission?: { submissionData?: { field: string; value: unknown }[] | null } | string | number | null
}

const STATUS_LABEL: Record<string, string> = {
  subscribed: 'Subscribed',
  applicant: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  confirmed: 'Confirmed',
  declined: 'Declined',
  participant: 'Participant',
  withdrawn: 'Withdrawn',
}

export const EventApplicantsTab: React.FC = () => {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const { routes } = config
  const { user } = useAuth<User>()
  // Registrations' read access silently scopes non-manage_events callers to
  // their own row (HTTP 200, filtered docs), so the fetch response itself
  // can't distinguish "no permission" from "no applicants" — check directly.
  const restricted = !hasPermission(user, 'manage_events')

  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [participantLimit, setParticipantLimit] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'applicant' | 'accepted' | 'confirmed' | 'rejected' | 'declined' | 'participant' | 'withdrawn'>('all')

  const eventId = id && id !== 'create' ? String(id) : null
  const requestedEventId = useRef<string | null>(null)

  const load = async () => {
    if (!eventId) {
      setLoading(false)
      return
    }
    requestedEventId.current = eventId
    try {
      const [eventRes, registrationsRes] = await Promise.all([
        fetch(`${routes.api}/events/${eventId}?depth=0`, { credentials: 'include' }),
        fetch(`${routes.api}/registrations?where[event][equals]=${eventId}&depth=2&limit=1000`, { credentials: 'include' }),
      ])
      const event = await eventRes.json()
      const registrations = await registrationsRes.json()

      // A stale response from an event the admin already navigated away from
      // must not overwrite the currently displayed event's data.
      if (requestedEventId.current !== eventId) return

      setParticipantLimit(typeof event.participant_limit === 'number' ? event.participant_limit : 0)
      setApplicants(
        (registrations.docs || []).map((doc: any) => ({
          id: String(doc.id),
          user: doc.user,
          status: doc.status ?? 'applicant',
          createdAt: doc.createdAt,
          submission: doc.submission,
        })),
      )
    } catch (e) {
      console.error('Failed to load applicants', e)
    } finally {
      if (requestedEventId.current === eventId) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [eventId])

  const filteredApplicants = useMemo(
    () => applicants.filter((a) => filter === 'all' || a.status === filter),
    [applicants, filter],
  )

  const selectable = filteredApplicants.filter((a) => BATCHABLE_STATUSES.includes(a.status))

  const statusCounts = useMemo(
    () =>
      applicants.reduce<Record<string, number>>((counts, a) => {
        counts[a.status] = (counts[a.status] ?? 0) + 1
        return counts
      }, {}),
    [applicants],
  )

  const TABS = [
    { key: 'all' as const, label: 'All', count: applicants.length },
    { key: 'subscribed' as const, label: 'Subscribed', count: statusCounts.subscribed ?? 0 },
    { key: 'applicant' as const, label: 'Pending', count: statusCounts.applicant ?? 0 },
    { key: 'accepted' as const, label: 'Accepted', count: statusCounts.accepted ?? 0 },
    { key: 'confirmed' as const, label: 'Confirmed', count: statusCounts.confirmed ?? 0 },
    { key: 'participant' as const, label: 'Participant', count: statusCounts.participant ?? 0 },
    { key: 'rejected' as const, label: 'Rejected', count: statusCounts.rejected ?? 0 },
    { key: 'declined' as const, label: 'Declined', count: statusCounts.declined ?? 0 },
    { key: 'withdrawn' as const, label: 'Withdrawn', count: statusCounts.withdrawn ?? 0 },
  ]

  const toggleSelect = (rowId: string) => {
    const next = new Set(selected)
    if (next.has(rowId)) next.delete(rowId)
    else next.add(rowId)
    setSelected(next)
  }

  const toggleExpand = (rowId: string) => {
    const next = new Set(expanded)
    if (next.has(rowId)) next.delete(rowId)
    else next.add(rowId)
    setExpanded(next)
  }

  const selectAll = () => setSelected(new Set(selectable.map((a) => a.id)))
  const deselectAll = () => setSelected(new Set())

  const runBatch = async (action: 'accept' | 'reject') => {
    if (action === 'accept') {
      const seatsAfter = applicants.filter((a) => SEATED_STATUSES.includes(a.status) || selected.has(a.id)).length
      if (participantLimit > 0 && seatsAfter > participantLimit) {
        alert(`Cannot accept: would exceed participant limit of ${participantLimit}`)
        return
      }
    }
    const verb = action === 'accept' ? 'accept' : 'REJECT'
    if (!confirm(`Are you sure you want to ${verb} ${selected.size} applicants?`)) return

    try {
      const res = await fetch(`/api/events/${eventId}/applicants/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, registrationIds: Array.from(selected) }),
      })
      if (!res.ok) throw new Error('Batch operation failed')
      setSelected(new Set())
      await load()
    } catch {
      alert('Failed to update applicants. Please try again.')
    }
  }

  if (!eventId) return null
  if (loading) return <div className={styles.container}>Loading applicants…</div>

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={filter === tab.key ? styles.tabActive : styles.tab}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label} <span className={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={selectAll}>Select All</button>
          <button type="button" className={styles.button} onClick={deselectAll}>Deselect All</button>
          {selected.size > 0 && (
            <>
              <button type="button" className={styles.buttonPrimary} onClick={() => runBatch('accept')}>
                Accept ({selected.size})
              </button>
              <button type="button" className={styles.buttonDanger} onClick={() => runBatch('reject')}>
                Reject ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '2.5rem' }}>
                <input
                  type="checkbox"
                  checked={selectable.length > 0 && selected.size === selectable.length}
                  onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Applied At</th>
              <th>Status</th>
              <th style={{ width: '2.5rem' }} />
            </tr>
          </thead>
          <tbody>
            {filteredApplicants.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  {restricted
                    ? "You don't have permission to view this event's applicants."
                    : 'No applicants found in this category.'}
                </td>
              </tr>
            ) : (
              filteredApplicants.map((applicant) => {
                const user = typeof applicant.user === 'object' ? applicant.user : undefined
                const submissionData = typeof applicant.submission === 'object'
                  ? applicant.submission?.submissionData
                  : undefined
                const isExpanded = expanded.has(applicant.id)
                const badgeClass = SEATED_STATUSES.includes(applicant.status)
                  ? styles.badgeSuccess
                  : applicant.status === 'rejected'
                    ? styles.badgeDanger
                    : styles.badgeWarning

                return (
                  <Fragment key={applicant.id}>
                    <tr>
                      <td>
                        {BATCHABLE_STATUSES.includes(applicant.status) && (
                          <input
                            type="checkbox"
                            checked={selected.has(applicant.id)}
                            onChange={() => toggleSelect(applicant.id)}
                          />
                        )}
                      </td>
                      <td>{user?.name_english?.first_name} {user?.name_english?.last_name}</td>
                      <td>{user?.email}</td>
                      <td>{user?.academic?.student_id || '—'}</td>
                      <td>{new Date(applicant.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td><span className={badgeClass}>{STATUS_LABEL[applicant.status] ?? applicant.status}</span></td>
                      <td>
                        {applicant.submission && (
                          <button type="button" className={styles.linkButton} onClick={() => toggleExpand(applicant.id)}>
                            {isExpanded ? 'Hide answers' : 'View answers'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={styles.answersRow}>
                        <td colSpan={7}>
                          {submissionData && submissionData.length > 0 ? (
                            <div className={styles.answersGrid}>
                              {submissionData.map(({ field, value }) => (
                                <div key={field}>
                                  <div className={styles.answerLabel}>{field}</div>
                                  <div className={styles.answerValue}>{String(value ?? '—')}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className={styles.answerLabel}>No form answers on record for this applicant.</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EventApplicantsTab
