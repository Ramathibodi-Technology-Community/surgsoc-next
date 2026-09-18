'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { Gutter } from '@payloadcms/ui'
import { importDataAction, validateDataAction } from './actions'
import styles from './DataImport.module.css'

type CollectionStats = {
  created: number
  updated: number
  skipped: number
  failed: number
}

type ImportState = {
  ok: boolean
  message: string
  details: string[]
  stats: Record<string, CollectionStats>
}

type ImportEntity = 'users' | 'events' | 'forms' | 'form-submissions' | 'registrations'
type InputFormat = 'json' | 'csv'

type ImportSchema = {
  label: string
  collection: string
  description: string
  requiredFields: string[]
  optionalFields: string[]
  csvColumns: string[]
  sampleJSON: Array<Record<string, unknown>>
  sampleCSV: string
}

const IMPORT_TABS: Array<{ entity: ImportEntity; label: string }> = [
  { entity: 'users', label: 'Users' },
  { entity: 'events', label: 'Events' },
  { entity: 'forms', label: 'Forms' },
  { entity: 'form-submissions', label: 'Form Submissions' },
  { entity: 'registrations', label: 'Registrations' },
]

const importInitialState: ImportState = {
  ok: true,
  message: 'Provide data and run import.',
  details: [],
  stats: {},
}

const validateInitialState: ImportState = {
  ok: true,
  message: 'Validate data before importing.',
  details: [],
  stats: {},
}

const SCHEMAS: Record<ImportEntity, ImportSchema> = {
  users: {
    label: 'Users',
    collection: 'users',
    description:
      'Creates or updates users by unique email. department, track and year accept a tag slug, label, or id.',
    requiredFields: ['email'],
    optionalFields: [
      'password',
      'roles',
      'department',
      'name_thai.*',
      'name_english.*',
      'academic.student_id',
      'academic.track',
      'academic.year',
      'contact.line_id',
      'contact.phone_number',
      'dob',
      'image_url',
    ],
    csvColumns: [
      'email',
      'password',
      'roles',
      'department',
      'name_english_first_name',
      'name_english_last_name',
      'student_id',
      'track',
      'year',
    ],
    sampleJSON: [
      {
        email: 'member-import@example.com',
        password: 'change-me',
        roles: ['member'],
        name_english: { first_name: 'Somchai', last_name: 'Jaidee' },
        academic: { student_id: '65001234', track: 'track-md', year: 'year-3' },
      },
    ],
    sampleCSV:
      'email,password,roles,department,name_english_first_name,name_english_last_name,student_id,track,year\n' +
      'member-import@example.com,change-me,member,dept-od,Somchai,Jaidee,65001234,track-md,year-3',
  },
  events: {
    label: 'Events',
    collection: 'events',
    description:
      'Creates or updates events by (name + date_begin). event_type, department and location accept a tag slug, label, or id.',
    requiredFields: ['name', 'event_type', 'date_begin'],
    optionalFields: [
      'date_end',
      'description',
      'is_visible',
      'department',
      'location',
      'subscription_form',
      'registration_opens_at',
      'registration_closes_at',
      'participant_limit',
      'status_override',
      'is_registration_closed',
      'owner',
      'coordinator',
    ],
    csvColumns: [
      'name',
      'event_type',
      'date_begin',
      'date_end',
      'is_visible',
      'department',
      'participant_limit',
      'status_override',
    ],
    sampleJSON: [
      {
        name: 'Imported Workshop',
        event_type: 'type-workshop-observe',
        date_begin: '2026-05-01T09:00:00Z',
        date_end: '2026-05-01T12:00:00Z',
        is_visible: true,
      },
    ],
    sampleCSV:
      'name,event_type,date_begin,date_end,is_visible,department,participant_limit,status_override\n' +
      'Imported Workshop,type-workshop-observe,2026-05-01T09:00:00Z,2026-05-01T12:00:00Z,true,dept-od,50,auto',
  },
  forms: {
    label: 'Forms',
    collection: 'forms',
    description: 'Creates or updates forms by title.',
    requiredFields: ['title'],
    optionalFields: [
      'submitButtonLabel',
      'confirmationType',
      'confirmationMessage',
      'redirect.url',
      'fields',
      'emails',
      'accept_responses',
      'response_deadline',
      'response_limit',
    ],
    csvColumns: [
      'title',
      'submit_button_label',
      'confirmation_type',
      'confirmation_message_text',
      'redirect_url',
      'fields_json',
      'emails_json',
      'accept_responses',
      'response_deadline',
      'response_limit',
    ],
    sampleJSON: [
      {
        title: 'Imported Form',
        submitButtonLabel: 'Submit',
        confirmationType: 'message',
        accept_responses: true,
      },
    ],
    sampleCSV:
      'title,submit_button_label,confirmation_type,confirmation_message_text,accept_responses,response_limit\n' +
      'Imported Form,Submit,message,Thanks for submitting!,true,100',
  },
  'form-submissions': {
    label: 'Form Submissions',
    collection: 'form-submissions',
    description: 'Creates form submissions in bulk.',
    requiredFields: ['form', 'submissionData[]'],
    optionalFields: ['user'],
    csvColumns: ['submission_group', 'form', 'user', 'field', 'value', 'submissionData_json'],
    sampleJSON: [
      {
        form: 1,
        user: 1,
        submissionData: [
          { field: 'fullName', value: 'Jane Doe' },
          { field: 'studentId', value: '65009999' },
        ],
      },
    ],
    sampleCSV:
      'submission_group,form,user,field,value,submissionData_json\n' +
      'sub-1,1,1,fullName,Jane Doe,\n' +
      'sub-1,1,1,studentId,65009999,\n' +
      'sub-2,1,2,,,"[{""field"":""fullName"",""value"":""John Doe""}]"',
  },
  registrations: {
    label: 'Registrations',
    collection: 'registrations',
    description:
      'Creates or updates one registration per (event, user) pair. `event` takes a numeric id or an exact event name; `user` takes a numeric id or an email. Re-running a corrected file updates rows rather than duplicating them.',
    requiredFields: ['event', 'user'],
    optionalFields: ['status', 'submission', 'rejection_reason'],
    csvColumns: ['event', 'user', 'status', 'submission_json', 'rejection_reason'],
    sampleJSON: [
      { event: 'Imported Workshop', user: 'member-import@example.com', status: 'participant' },
      { event: 3, user: 12, status: 'rejected', rejection_reason: 'Over capacity' },
    ],
    sampleCSV:
      'event,user,status,submission_json,rejection_reason\n' +
      'Imported Workshop,member-import@example.com,participant,,\n' +
      '3,12,rejected,,Over capacity',
  },
}

function cx(...parts: Array<string | false>) {
  return parts.filter(Boolean).join(' ')
}

export default function ImportDataForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [entityType, setEntityType] = useState<ImportEntity>('users')
  const [inputFormat, setInputFormat] = useState<InputFormat>('csv')
  const [state, action, pending] = useActionState<ImportState, FormData>(importDataAction, importInitialState)
  const [validateState, validateAction, validatePending] = useActionState<ImportState, FormData>(
    validateDataAction,
    validateInitialState,
  )

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const activeSchema = useMemo(() => SCHEMAS[entityType], [entityType])
  const hasStats = Object.keys(state?.stats || {}).length > 0
  const hasValidateStats = Object.keys(validateState?.stats || {}).length > 0

  useEffect(() => {
    const entity = searchParams.get('entity')
    if (IMPORT_TABS.some((tab) => tab.entity === entity)) {
      setEntityType(entity as ImportEntity)
    }
  }, [searchParams])

  const setEntityTab = (nextEntity: ImportEntity) => {
    setEntityType(nextEntity)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('entity', nextEntity)
    router.replace(`/admin/data-import?${nextParams.toString()}`)
  }

  const fillSamplePayload = () => {
    if (!textareaRef.current) return
    textareaRef.current.value = inputFormat === 'json'
      ? JSON.stringify(activeSchema.sampleJSON, null, 2)
      : activeSchema.sampleCSV
    textareaRef.current.focus()
  }

  const downloadTemplate = () => {
    const fileName = `surgsoc-${entityType}-template.${inputFormat}`
    const content = inputFormat === 'json'
      ? JSON.stringify(activeSchema.sampleJSON, null, 2)
      : activeSchema.sampleCSV

    const blob = new Blob([content], {
      type: inputFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const validateStatusClass = validateState.message === validateInitialState.message
    ? styles.status
    : cx(styles.status, validateState.ok ? styles.statusOk : styles.statusError)

  const importStatusClass = state.message === importInitialState.message
    ? styles.status
    : cx(styles.status, state.ok ? styles.statusOk : styles.statusError)

  return (
    <Gutter>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Data Import</h1>
          <div className={styles.tabBar}>
            {IMPORT_TABS.map((tab) => {
              const isActive = tab.entity === entityType
              return (
                <button
                  key={tab.entity}
                  type="button"
                  onClick={() => setEntityTab(tab.entity)}
                  className={cx(styles.tab, isActive && styles.tabActive)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <p className={styles.description}>
            Import data by collection type. Each tab uses type-specific validation and import rules.
          </p>
          <p className={styles.tip}>
            Relation fields must reference existing records in this database.
          </p>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Import Settings</h2>
          <div className={styles.grid2}>
            <div>
              <label className={styles.label}>Collection</label>
              <div className={styles.input}>
                {activeSchema.label}{' '}
                <Link href={`/admin/collections/${activeSchema.collection}`} className={styles.openCollectionLink}>
                  Open Collection
                </Link>
              </div>
            </div>
            <div>
              <label htmlFor="inputFormat" className={styles.label}>Input Format</label>
              <select
                id="inputFormat"
                name="inputFormat"
                value={inputFormat}
                onChange={(event) => setInputFormat(event.target.value as InputFormat)}
                className={styles.select}
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{activeSchema.label} Schema</h2>
          <p className={styles.description}>{activeSchema.description}</p>
          <div className={styles.grid2}>
            <div>
              <label className={styles.label}>Required</label>
              <ul className={styles.list}>
                {activeSchema.requiredFields.map((field) => (
                  <li key={field}><span className={styles.mono}>{field}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <label className={styles.label}>Common Optional</label>
              <ul className={styles.list}>
                {activeSchema.optionalFields.map((field) => (
                  <li key={field}><span className={styles.mono}>{field}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <label className={styles.label}>CSV Columns</label>
          <div className={styles.pillWrap}>
            {activeSchema.csvColumns.map((field) => (
              <span key={field} className={styles.pill}>{field}</span>
            ))}
          </div>
        </div>

        <form action={action} className={styles.panel}>
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="inputFormat" value={inputFormat} />

          <div style={{ marginBottom: '0.9rem' }}>
            <label htmlFor="payloadFile" className={styles.label}>
              Upload {inputFormat.toUpperCase()} File (optional)
            </label>
            <input
              id="payloadFile"
              name="payloadFile"
              type="file"
              accept={inputFormat === 'json' ? 'application/json,.json' : '.csv,text/csv'}
              className={styles.input}
            />
          </div>

          <div style={{ marginBottom: '0.9rem' }}>
            <label htmlFor="payloadText" className={styles.label}>
              Paste {inputFormat.toUpperCase()} (optional)
            </label>
            <textarea
              ref={textareaRef}
              id="payloadText"
              name="payloadText"
              className={styles.textarea}
              placeholder={inputFormat === 'json' ? JSON.stringify(activeSchema.sampleJSON, null, 2) : activeSchema.sampleCSV}
            />
          </div>

          {/*
            Registrations are the one entity whose import can email people. Off
            by default: the common case is backfilling attendance that already
            happened, and the emails for that would be wrong to send.
          */}
          {entityType === 'registrations' && (
            <div style={{ marginBottom: '0.9rem' }}>
              <label htmlFor="notifyOnImport" className={styles.label}>
                <input id="notifyOnImport" name="notifyOnImport" type="checkbox" style={{ marginRight: 8 }} />
                Send notification emails for imported rows
              </label>
              <p className={styles.helpText}>
                Leave unchecked when backfilling past events. When checked, accepted, rejected and
                confirmed rows email the user exactly as an admin-made change would.
              </p>
            </div>
          )}

          <div className={styles.buttonRow}>
            <button type="button" onClick={downloadTemplate} className={styles.button}>
              Download {inputFormat.toUpperCase()} Template
            </button>
            <button type="button" onClick={fillSamplePayload} className={styles.button}>
              Paste Sample {inputFormat.toUpperCase()}
            </button>
            <button type="submit" formAction={validateAction} disabled={validatePending} className={styles.button}>
              {validatePending ? 'Validating…' : `Validate ${activeSchema.label}`}
            </button>
            <button type="submit" disabled={pending} className={cx(styles.button, styles.buttonPrimary)}>
              {pending ? 'Importing…' : `Import ${activeSchema.label}`}
            </button>
            <span className={styles.helpText}>
              {inputFormat === 'csv'
                ? 'CSV rows are parsed into Payload documents by schema before import.'
                : 'JSON should be an array of documents for the selected type.'}
            </span>
          </div>
        </form>

        <div className={validateStatusClass}>{validateState.message}</div>

        {hasValidateStats && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Validation Summary</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Skipped</th>
                    <th>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(validateState.stats).map(([collection, stat]) => (
                    <tr key={collection}>
                      <td className={styles.mono}>{collection}</td>
                      <td>{stat.skipped}</td>
                      <td>{stat.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {validateState.details.length > 0 && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Validation Details</h2>
            <ul className={styles.list}>
              {validateState.details.map((detail, idx) => (
                <li key={`${detail}-${idx}`}>{detail}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={importStatusClass}>{state.message}</div>

        {hasStats && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Import Summary</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Skipped</th>
                    <th>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(state.stats).map(([collection, stat]) => (
                    <tr key={collection}>
                      <td className={styles.mono}>{collection}</td>
                      <td>{stat.created}</td>
                      <td>{stat.updated}</td>
                      <td>{stat.skipped}</td>
                      <td>{stat.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {state.details.length > 0 && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Details</h2>
            <ul className={styles.list}>
              {state.details.map((detail, idx) => (
                <li key={`${detail}-${idx}`}>{detail}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Gutter>
  )
}
