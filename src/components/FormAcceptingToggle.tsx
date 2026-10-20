'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/client'
import { setAcceptResponses } from '@/app/[locale]/(frontend)/forms/manage/actions'
import { ConfirmSwitch } from '@/components/ui/switch'

/* design.md § ConfirmSwitch: "Accepting responses" changes what members can do, so both directions confirm. */
export default function FormAcceptingToggle({ formId, accepting, compact }: { formId: number; accepting: boolean; compact?: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className={compact ? 'flex items-center gap-3' : 'mb-6 flex items-center gap-4'}>
      <div className="flex flex-col">
        <span id="accepting-label" className="font-medium">{t('forms.editor.accepting_label')}</span>
        <span className="text-meta text-muted-foreground">{accepting ? t('forms.editor.accepting_on') : t('forms.editor.accepting_off')}</span>
        {error && <span role="alert" className="text-meta text-destructive">{error}</span>}
      </div>
      <ConfirmSwitch
        aria-labelledby="accepting-label"
        checked={accepting}
        pending={pending}
        onConfirm={async next => {
          setPending(true); setError('')
          try { await setAcceptResponses(formId, next); router.refresh() }
          catch (failure) { setError(failure instanceof Error ? failure.message : '') }
          finally { setPending(false) }
        }}
        on={{ title: t('forms.editor.start_q'), description: t('forms.editor.start_body'), action: t('forms.editor.start'), keep: t('forms.editor.keep_closed') }}
        off={{ title: t('forms.editor.stop_q'), description: t('forms.editor.stop_body'), action: t('forms.editor.stop'), keep: t('forms.editor.keep_accepting') }}
      />
    </div>
  )
}
