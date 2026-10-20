'use client'

import React from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { useTranslation } from '@/i18n/client'
import { Button } from '@/components/ui/button'
import { SectionTabs } from '@/components/ui/section-tabs'
import FormAcceptingToggle from '@/components/FormAcceptingToggle'

export type FormStaffTab = 'questions' | 'after' | 'availability' | 'settings' | 'responses'

/*
  The staff view of one form: back link, title, preview, the accepting switch,
  then the section tabs. The editor and the Responses page both sit inside it,
  so a form's questions and its answers are one place, as an event's details
  and its applicants are.
*/
export default function FormShell({ formId, title, subtitle, accepting, tab, back, responseCount, canAssign, actions, children }: {
  formId: number | null
  title: string
  subtitle?: string
  accepting: boolean
  tab: FormStaffTab
  back?: string | null
  responseCount: number
  canAssign: boolean
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const q = back ? `&returnTo=${encodeURIComponent(back)}` : ''
  const edit = (key: string) => `${formId ? `/forms/${formId}/edit` : '/forms/new'}?tab=${key}${q}`
  const tabs = [
    { key: 'questions', label: t('forms.editor.tab_questions'), href: edit('questions') },
    { key: 'after', label: t('forms.editor.tab_after'), href: edit('after') },
    { key: 'availability', label: t('forms.editor.tab_availability'), href: edit('availability') },
    { key: 'settings', label: t('forms.editor.tab_settings'), href: edit('settings') },
    ...(formId ? [{ key: 'responses', label: t('forms.editor.tab_responses'), href: `/forms/${formId}/submissions${back ? `?returnTo=${encodeURIComponent(back)}` : ''}`, badge: responseCount, badgeTone: 'muted' as const }] : []),
    ...(formId && canAssign ? [{ key: 'assign', label: t('forms.editor.tab_assign'), href: `/admin/collections/forms/${formId}` }] : []),
  ]
  return (
    <>
      <Link className="hit-area text-meta text-muted-foreground hover:text-foreground" href={back || '/forms/manage'}>← {back ? t('events.applicants.back_to_event') : t('forms.editor.manage')}</Link>
      <div className="mt-5 mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="type-h1">{title || t('forms.editor.new_form')}</h1>
          {subtitle && <p className="mt-2 text-meta text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {formId && <Button asChild variant="outline"><Link href={`/forms/${formId}`}><Eye />{t('forms.editor.preview_as_member')}</Link></Button>}
          {formId && <FormAcceptingToggle formId={formId} accepting={accepting} compact />}
          {actions}
        </div>
      </div>
      <SectionTabs label={t('forms.editor.tabs_label')} value={tab} tabs={tabs} />
      {children}
    </>
  )
}
