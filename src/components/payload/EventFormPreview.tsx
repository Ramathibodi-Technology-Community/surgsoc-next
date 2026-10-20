'use client'

import { useEffect, useState } from 'react'
import { useFormFields, useConfig } from '@payloadcms/ui'
import PayloadForm from '@/components/PayloadForm'

export function EventFormPreview() {
  const formId = useFormFields(([fields]) => fields.subscription_form?.value)
  const { config } = useConfig()
  const [form, setForm] = useState<any>(null)
  useEffect(() => {
    const controller = new AbortController()
    setForm(null)
    if (formId) fetch(`${config.routes.api}/forms/${typeof formId === 'object' ? (formId as any).id : formId}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(setForm).catch(() => {})
    return () => controller.abort()
  }, [formId, config.routes.api])
  if (!form) return null
  return <section><h3>Application form preview / ตัวอย่างแบบฟอร์มสมัคร</h3><PayloadForm form={form} preview onSubmit={async () => {}} /></section>
}
