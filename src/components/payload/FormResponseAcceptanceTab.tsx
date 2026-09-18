'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import styles from './FormTabs.module.css'

type Assignment = {
  id: string | number
  completed?: boolean
  deadline?: string | null
  createdAt?: string
  user?: { id?: string | number; email?: string } | string | number | null
  submission?: { id?: string | number } | string | number | null
}

export const FormResponseAcceptanceTab: React.FC = () => {
  const { id } = useDocumentInfo()
  const { config } = useConfig()
  const { routes } = config

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | number | null>(null)

  const formId = useMemo(() => {
    if (id && id !== 'create') return String(id)

    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/admin\/(?:collections\/)?forms\/([^/]+)/)
      if (match?.[1] && match[1] !== 'create') return decodeURIComponent(match[1])
    }

    return null
  }, [id])

  const refresh = async () => {
    if (!formId) {
      setAssignments([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const query = new URLSearchParams({
        depth: '1',
        limit: '1000',
        sort: '-createdAt',
      })

      const res = await fetch(
        `${routes.api}/form-assignments?where[form][equals]=${formId}&${query.toString()}`,
        { credentials: 'include' },
      )

      const data = await res.json()
      setAssignments(Array.isArray(data?.docs) ? data.docs : [])
    } catch (error) {
      console.error('Failed to load form assignments', error)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [formId, routes.api])

  const { completedCount, pendingCount } = useMemo(() => {
    const completed = assignments.filter((assignment) => assignment.completed).length
    return {
      completedCount: completed,
      pendingCount: assignments.length - completed,
    }
  }, [assignments])

  const toggleCompleted = async (assignment: Assignment) => {
    const assignmentId = assignment.id
    if (!assignmentId) return

    setUpdatingId(assignmentId)
    try {
      await fetch(`${routes.api}/form-assignments/${assignmentId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completed: !assignment.completed,
        }),
      })

      await refresh()
    } catch (error) {
      console.error('Failed to update assignment completion', error)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.emptyState} style={{ border: 'none' }}>
        Loading response acceptance data...
      </div>
    )
  }

  if (!formId) {
    return (
      <div className={styles.emptyState} style={{ border: 'none' }}>
        Please save the form first to manage response acceptance.
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Response Acceptance</h2>

        <div className={styles.badgeContainer}>
          <span className={`${styles.badge} ${styles.badgeTotal}`}>Total: {assignments.length}</span>
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>Completed: {completedCount}</span>
          <span className={`${styles.badge} ${styles.badgeWarning}`}>Pending: {pendingCount}</span>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className={styles.emptyState}>
          No assignments found for this form yet.
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Assignee</th>
                <th>Deadline</th>
                <th>Submission</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((assignment, index) => {
                const userEmail =
                  typeof assignment.user === 'object'
                    ? assignment.user?.email
                    : assignment.user
                      ? String(assignment.user)
                      : 'Unknown user'

                const submissionValue = assignment.submission
                const submissionId =
                  typeof submissionValue === 'object'
                    ? submissionValue?.id
                    : submissionValue
                      ? submissionValue
                      : null

                return (
                  <tr key={String(assignment.id)}>
                    <td>{userEmail || 'Unknown user'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {assignment.deadline ? new Date(assignment.deadline).toLocaleString() : '-'}
                    </td>
                    <td>{submissionId ? `#${submissionId}` : '-'}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          assignment.completed
                            ? styles.badgeSuccess
                            : styles.badgeWarning
                        }`}
                      >
                        {assignment.completed ? 'Accepted' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={updatingId === assignment.id}
                        onClick={() => void toggleCompleted(assignment)}
                        className={styles.button}
                      >
                        {updatingId === assignment.id
                          ? 'Updating…'
                          : assignment.completed
                            ? 'Mark Pending'
                            : 'Accept Response'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
