
'use client'

import React, { useState, useEffect } from 'react'
import { useConfig } from '@payloadcms/ui'
import { Gutter, Button } from '@payloadcms/ui'
import { bulkAssignForm } from '@/actions/bulk-assign' // Ensure alias is correct or relative path

type Option = {
    label: string
    value: string | number
}

export const BulkAssignmentView: React.FC = () => {
  const { config } = useConfig()
  const { routes } = config
  const [forms, setForms] = useState<Option[]>([])
  const [groups, setGroups] = useState<Option[]>([])
  const [selectedForm, setSelectedForm] = useState<string>('')
  const [targetType, setTargetType] = useState<'all' | 'group'>('group')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
        try {
            // Fetch Forms
            const formsRes = await fetch(`${routes.api}/forms?limit=100`)
            const formsData = await formsRes.json()
            if (formsData.docs) {
                setForms(formsData.docs.map((f: any) => ({ label: f.title || f.name || `Form ${f.id}`, value: f.id })))
            }

            // Fetch Groups
            const groupsRes = await fetch(`${routes.api}/groups?limit=100`)
            const groupsData = await groupsRes.json()
            if (groupsData.docs) {
                setGroups(groupsData.docs.map((g: any) => ({ label: g.name, value: g.id })))
            }
        } catch (e) {
            console.error('Failed to fetch options', e)
        }
    }
    fetchData()
  }, [routes.api])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedForm) {
        setStatus({ type: 'error', message: 'Please select a form' })
        return
    }
    if (targetType === 'group' && !selectedGroup) {
        setStatus({ type: 'error', message: 'Please select a group' })
        return
    }

    setLoading(true)
    setStatus(null)

    try {
        const res = await bulkAssignForm(selectedForm, targetType, targetType === 'group' ? selectedGroup : undefined)
        if (res.success) {
            setStatus({ type: 'success', message: res.message })
        } else {
            setStatus({ type: 'error', message: res.message })
        }
    } catch (e) {
        setStatus({ type: 'error', message: 'An unexpected error occurred' })
    } finally {
        setLoading(false)
    }
  }

  return (
    <Gutter>
        <h1>Bulk Form Assignment</h1>
        <form onSubmit={handleSubmit} style={{ maxWidth: '600px', marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Form</label>
                <select
                    value={selectedForm}
                    onChange={(e) => setSelectedForm(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    <option value="">-- Select Form --</option>
                    {forms.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Target Audience</label>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ marginRight: '15px' }}>
                        <input
                            type="radio"
                            name="targetType"
                            value="group"
                            checked={targetType === 'group'}
                            onChange={() => setTargetType('group')}
                        /> By Group (Role, Dept, Year)
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="targetType"
                            value="all"
                            checked={targetType === 'all'}
                            onChange={() => setTargetType('all')}
                        /> All Users
                    </label>
                </div>
            </div>

            {targetType === 'group' && (
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Select Group</label>
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                         style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">-- Select Group --</option>
                        {groups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                style={{
                    padding: '10px 20px',
                    background: '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? 'Assigning…' : 'Assign Forms'}
            </button>

            {status && (
                <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    borderRadius: '4px',
                    /* Payload's own theme vars, not fixed hex — this renders
                       inside the admin panel, which has its own light/dark
                       themes that hardcoded Bootstrap-alert colours ignore. */
                    background: status.type === 'success' ? 'var(--theme-success-100)' : 'var(--theme-error-100)',
                    color: status.type === 'success' ? 'var(--theme-success-500)' : 'var(--theme-error-500)'
                }}>
                    {status.message}
                </div>
            )}
        </form>
    </Gutter>
  )
}
