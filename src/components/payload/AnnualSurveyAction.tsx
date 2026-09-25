'use client'

import { useState } from 'react'
import { useDocumentInfo, useField } from '@payloadcms/ui'
import { activateAnnualSurvey, deactivateAnnualSurvey } from '@/actions/annual-survey'

// Activation is a deliberate action, not a checkbox+Save edit: Confirm writes
// straight to the server (bypassing the generic form Save) and errors if the
// deadline is blank. Once active, the only action is Cancel — editing an
// active assignment isn't supported yet, so there's no Edit button here.
export function AnnualSurveyAction() {
  const { id, initialData } = useDocumentInfo()
  const { value: deadline } = useField<string>({ path: 'survey_deadline' })
  const { value: activationAt } = useField<string>({ path: 'survey_activation_at' })
  const [status, setStatus] = useState('')
  const active = Boolean(initialData?.annual_survey_enabled)

  if (!id || id === 'create') return null

  if (active) {
    return (
      <div>
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('Cancel this annual survey? Members who have not yet completed it will be un-assigned.')) return
            try {
              await deactivateAnnualSurvey(id)
              window.location.reload()
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'Could not cancel the annual survey.')
            }
          }}
        >
          Cancel annual survey
        </button>
        {status && <p>{status}</p>}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          try {
            await activateAnnualSurvey(id, deadline, activationAt || null)
            window.location.reload()
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Could not activate the annual survey.')
          }
        }}
      >
        Confirm activation
      </button>
      {status && <p>{status}</p>}
    </div>
  )
}
