'use client'

import React from 'react'
import { CheckboxInput, FieldLabel, useField } from '@payloadcms/ui'
import { PERMISSIONS } from '@/libs/permissions'

type PermissionMap = Record<string, unknown>

/*
  Checkbox UI for `groups.permissions`, replacing Payload's default Monaco JSON
  editor (see JsonView for why Monaco cannot load under our CSP).

  Checkboxes are the better control here regardless of the CSP: the key set is
  fixed and known, and hand-typing this JSON is how a group silently ends up
  granting nothing. The live database already carries one such key —
  `manage_system` on the superadmin group, which no code reads.

  Unknown keys like that are preserved rather than dropped. They are invisible
  here, but a save should not quietly delete data this UI does not understand.
*/
export const PermissionsField: React.FC<{
  path?: string
  field?: { label?: unknown }
  readOnly?: boolean
}> = ({ path, field, readOnly }) => {
  const { disabled, setValue, value } = useField<PermissionMap>({ path })
  const locked = readOnly || disabled

  const current: PermissionMap = value && typeof value === 'object' ? value : {}

  const toggle = (key: string, checked: boolean) => {
    // Spread first so keys this component does not render survive the write.
    const next: PermissionMap = { ...current }
    if (checked) next[key] = true
    else delete next[key]
    setValue(next)
  }

  return (
    <div className="field-type">
      <FieldLabel label={field?.label as string | undefined} path={path} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {PERMISSIONS.map(([key, label]) => (
          <CheckboxInput
            checked={current[key] === true}
            id={`${path}-${key}`}
            key={key}
            label={label}
            name={key}
            onToggle={(e) => toggle(key, e.target.checked)}
            readOnly={locked}
          />
        ))}
      </div>
    </div>
  )
}
