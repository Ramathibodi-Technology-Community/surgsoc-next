'use client'

import React, { useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { getNestedValue } from '@/libs/forms/prefillUserData'

interface UserProfileFieldProps {
  label: string
  /** Dot-path into the user object, e.g. "name_english.first_name" */
  profileField: string
  readOnly?: boolean
  value?: string
  onChange: (value: string) => void
  required?: boolean
  user?: any
}

export default function UserProfileField({
  label,
  profileField,
  readOnly = true,
  value,
  onChange,
  required,
  user,
}: UserProfileFieldProps) {
  // Auto-fill from user profile on mount / when user changes
  useEffect(() => {
    if (user && profileField) {
      const profileValue = getNestedValue(user, profileField)
      if (profileValue !== undefined && profileValue !== null) {
        onChange(String(profileValue))
      }
    }
   
  }, [user, profileField])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {readOnly && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Auto-filled
          </span>
        )}
      </div>
      <Input
        type="text"
        value={value || ''}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        required={required}
        className={readOnly ? 'bg-muted/50 cursor-not-allowed text-muted-foreground' : ''}
        placeholder={user ? '' : 'Sign in to auto-fill'}
      />
    </div>
  )
}
