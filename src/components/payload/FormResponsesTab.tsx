'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import styles from './FormTabs.module.css'

type Submission = {
  id: string
  submissionData: { field: string; value: unknown }[]
  createdAt: string
  user?: { email: string } | string
}

export const FormResponsesTab: React.FC = () => {
  const { id } = useDocumentInfo()

  const { config } = useConfig()
  const { routes } = config
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const formId = useMemo(() => {
    if (id && id !== 'create') return String(id)

    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/admin\/(?:collections\/)?forms\/([^/]+)/)
      if (match?.[1] && match[1] !== 'create') return decodeURIComponent(match[1])
    }

    return null
  }, [id])

  useEffect(() => {
    if (!formId) {
        setLoading(false)
        return
    }

    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`${routes.api}/form-submissions?where[form][equals]=${formId}&limit=1000`, {
          credentials: 'include'
        })
        const data = await res.json()

        if (data.docs) {
            setSubmissions(data.docs)

            // Extract all unique field names for columns
            const fieldNames = new Set<string>()
            data.docs.forEach((sub: Submission) => {
                sub.submissionData?.forEach(item => fieldNames.add(item.field))
            })
            setColumns(Array.from(fieldNames))
        }
      } catch (e) {
        console.error('Failed to fetch submissions', e)
      } finally {
        setLoading(false)
      }
    }

    fetchSubmissions()
    fetchSubmissions()
  }, [formId, routes.api])

  const exportCSV = () => {
    if (submissions.length === 0) return

    const header = ['User', 'Date', ...columns].join(',')
    const rows = submissions.map(sub => {
        const userData = typeof sub.user === 'object' ? (sub.user as any)?.email : (sub.user || 'Anonymous')
        const date = new Date(sub.createdAt).toISOString()
        const fieldValues = columns.map(col => {
            const fieldData = sub.submissionData?.find(d => d.field === col)
            let val = fieldData?.value
            if (typeof val === 'object') val = JSON.stringify(val)
            return `"${String(val || '').replace(/"/g, '""')}"`
        })
        return [`"${userData}"`, `"${date}"`, ...fieldValues].join(',')
    })

    const csvContent = [header, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `submissions-${formId || 'form'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportJSON = () => {
    if (submissions.length === 0) return

    const data = submissions.map(sub => {
      const userData = typeof sub.user === 'object' ? (sub.user as any)?.email : (sub.user || 'Anonymous')
      const formattedSubmission: Record<string, any> = {
        User: userData,
        Date: new Date(sub.createdAt).toISOString(),
      }
      columns.forEach(col => {
        const fieldData = sub.submissionData?.find(d => d.field === col)
        formattedSubmission[col] = fieldData?.value ?? null
      })
      return formattedSubmission
    })

    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `submissions-${formId || 'form'}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return (
    <div className={styles.emptyState} style={{ border: 'none' }}>
        Loading responses...
    </div>
  )

    if (!formId) {
      return (
          <div className={styles.emptyState} style={{ border: 'none' }}>
              Please save the form first to view responses.
          </div>
      )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
          <h2 className={styles.title}>
            Form Responses
            <span className={`${styles.badge} ${styles.badgeTotal}`} style={{ marginLeft: '12px' }}>
              {submissions.length}
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={exportCSV}
              className={styles.button}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportJSON}
              className={styles.button}
            >
              Export JSON
            </button>
          </div>
      </div>

      {submissions.length === 0 ? (
          <div className={styles.emptyState}>
              No responses recorded yet.
          </div>
      ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                    <th>User</th>
                    <th>Date</th>
                    {columns.map(col => (
                        <th key={col}>{col}</th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {submissions.map((sub, i) => (
                    <tr key={sub.id}>
                        <td>
                            {typeof sub.user === 'object' ? sub.user?.email : (sub.user || 'Anonymous')}
                        </td>
                        <td>{new Date(sub.createdAt).toLocaleString()}</td>
                        {columns.map(col => {
                            const fieldData = sub.submissionData?.find(d => d.field === col)
                            return (
                                <td key={col} className={styles.truncate} title={String(fieldData?.value || '')}>
                                    {String(fieldData?.value || '-')}
                                </td>
                            )
                        })}
                    </tr>
                    ))}
                </tbody>
            </table>
          </div>
      )}
    </div>
  )
}
