'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/[locale]/(frontend)/account/actions'
import { tagId, tagLabel, type TagLike } from '@/libs/tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/libs/utils'

// ─── Editable Section Wrapper ───────────────────────────────────────
/**
 * One infobox per group of facts, and one save per infobox.
 *
 * Each section is its own `<form>` posting its own section name. The page used
 * to be a single form with one Save at the bottom, which meant a member editing
 * their phone number submitted all five sections, and the toggle that closed a
 * section threw the edit away without ever saying so.
 *
 * The section name is not decoration — see the note on `updateProfile`. The
 * action writes a whole user document, so a save that did not say which section
 * it was for would blank every field that was not on screen.
 *
 * Save is the one action of the box, so it fills; Discard is the way out beside
 * it, quiet. They are not a pair to choose between. "Cancel" is banned as a
 * label site-wide — here it would also read as cancelling a registration.
 */
function EditableSection({
  section,
  title,
  children,
  editForm,
  /** Attaches this section's repeatable lists, which live in React state. */
  serialize,
}: {
  section: string
  title: string
  children: React.ReactNode
  editForm: React.ReactNode
  serialize?: (formData: FormData) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    formData.set('section', section)
    serialize?.(formData)

    const result = await updateProfile(null, formData)
    setSaving(false)

    if (result.success) {
      // Silent success — closing the editor puts the saved values on screen,
      // which is the acknowledgement. A toast would say it a second time.
      setEditing(false)
      router.refresh()
    } else {
      setError(result.message || 'Failed to save.')
    }
  }

  if (!editing) {
    return (
      <section className="panel p-4 sm:p-5">
        <div className="panel-head">
          <h3 className="panel-title">{title}</h3>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md text-[13px] font-medium text-accent transition-colors hover:text-accent/80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Edit
          </button>
        </div>
        {children}
      </section>
    )
  }

  return (
    <section className="panel p-4 sm:p-5">
      <form onSubmit={handleSubmit}>
        <div className="panel-head">
          <h3 className="panel-title">{title}</h3>
        </div>

        {editForm}

        {/*
          Actions at the foot, not in the head: Personal information runs to
          seven fields, and a Save button above them is a long way from the last
          thing you typed. Separated by space — a card footer takes no hairline.
        */}
        {/* 34px, the card-footer size — and the floor, because it is already the
            smallest a thumb can reliably hit. `size="sm"` alone is 32. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="sm"
            className="h-[34px] px-4"
            disabled={saving}
            aria-busy={saving}
          >
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            Save
          </Button>
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setError(null)
            }}
            className="inline-flex h-[34px] items-center rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Discard
          </button>

          {/*
            The error sits with the button that failed, not at the top of the
            page — this form is one of five on screen, and a page-level banner
            would not say which one it meant.
          */}
          {error && (
            <p role="alert" aria-live="assertive" className="text-[13px] font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
      </form>
    </section>
  )
}

// ─── Input Helper ───────────────────────────────────────────────────
function Field({ label, name, defaultValue, placeholder, type = 'text', readOnly }: {
  label: string; name: string; defaultValue?: string; placeholder?: string; type?: string; readOnly?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(readOnly && 'opacity-50 cursor-not-allowed')}
      />
    </div>
  )
}

// ─── Display helpers ───────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium text-sm">{value || <span className="text-muted-foreground italic">—</span>}</p>
    </div>
  )
}

function getFieldLabel(key: string) {
  const labels: Record<string, string> = {
      first_name_thai: 'First Name (Thai)',
      last_name_thai: 'Last Name (Thai)',
      first_name_english: 'First Name (English)',
      last_name_english: 'Last Name (English)',
      nickname_thai: 'Nickname (Thai)',
      nickname_english: 'Nickname (English)',
      dob: 'Date of Birth',
      student_id: 'Student ID',
      track: 'Track',
      year: 'Year',
      phone: 'Phone',
      line_id: 'Line ID',
      platform: 'Platform',
      handle: 'Handle',
      activity: 'Activity',
      role: 'Role',
  }
  return labels[key] || key
}

// ─── Main Component ─────────────────────────────────────────────────
export default function ProfileEditor({
  user,
  /*
    The vocabularies now live in `tags`, so they are fetched on the server and
    handed down rather than imported — this is a client component and the lists
    are editable in the admin panel. Adding a track is a row, not a deploy.
  */
  interestOptions,
  trackOptions,
  yearOptions,
}: {
  user: any
  interestOptions: TagLike[]
  trackOptions: TagLike[]
  yearOptions: TagLike[]
}) {
  /*
    The two repeatable lists stay here rather than inside their sections: both
    are rendered in the read view as well as the edit form, so the section that
    edits them is not the only thing that needs them.

    Each is serialised into the one form that owns it — portfolio into the
    Portfolio section, social accounts into Contact — so no other section can
    submit them, and `updateProfile` never sees a list it was not asked to
    change.
  */
  const [portfolio, setPortfolio] = useState<any[]>(Array.isArray(user.portfolio) ? user.portfolio : [])
  const [socialMedia, setSocialMedia] = useState<any[]>(
    Array.isArray(user.social_media) ? user.social_media : []
  )

  return (
    /*
      Not one form any more. Each section posts itself, so a member editing
      their phone number no longer submits their portfolio along with it — and
      nested forms are invalid markup, which is what a per-section save inside a
      page-level form would have required.

      Stacked full width rather than a two-up grid: these groups run from three
      fields to a whole portfolio list, and a grid would either stretch the
      short ones or ragged-edge the tall ones.
    */
    <div className="space-y-3.5">
      {/* ── Personal Info ── */}
      <EditableSection section="personal" title="Personal Information"
        editForm={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={getFieldLabel('first_name_thai')} name="first_name_thai" defaultValue={user.name_thai?.first_name} />
            <Field label={getFieldLabel('last_name_thai')} name="last_name_thai" defaultValue={user.name_thai?.last_name} />
            <Field label={getFieldLabel('first_name_english')} name="first_name_english" defaultValue={user.name_english?.first_name} />
            <Field label={getFieldLabel('last_name_english')} name="last_name_english" defaultValue={user.name_english?.last_name} />
            <Field label={getFieldLabel('nickname_thai')} name="nickname_thai" defaultValue={user.name_thai?.nickname} />
            <Field label={getFieldLabel('nickname_english')} name="nickname_english" defaultValue={user.name_english?.nickname} />
            <Field label={getFieldLabel('dob')} name="dob" type="date" defaultValue={user.dob ? new Date(user.dob).toISOString().split('T')[0] : ''} />
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <InfoRow label="Thai Name" value={`${user.name_thai?.first_name || ''} ${user.name_thai?.last_name || ''}`.trim() || undefined} />
          <InfoRow label="English Name" value={`${user.name_english?.first_name || ''} ${user.name_english?.last_name || ''}`.trim() || undefined} />
          <InfoRow label={getFieldLabel('nickname_thai')} value={user.name_thai?.nickname} />
          <InfoRow label={getFieldLabel('nickname_english')} value={user.name_english?.nickname} />
          <InfoRow label={getFieldLabel('dob')} value={user.dob ? new Date(user.dob).toLocaleDateString('en-US') : undefined} />
        </div>
      </EditableSection>

      {/* ── Academic Info ── */}
      <EditableSection section="academic" title="Academic Information"
        editForm={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={getFieldLabel('student_id')} name="student_id" defaultValue={user.academic?.student_id} />
            <div className="space-y-1">
              <Label htmlFor="track" className="text-xs text-muted-foreground">{getFieldLabel('track')}</Label>
              <Select name="track" defaultValue={String(tagId(user.academic?.track) ?? '')}>
                <SelectTrigger id="track">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {trackOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>{tagLabel(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="year" className="text-xs text-muted-foreground">{getFieldLabel('year')}</Label>
              <Select name="year" defaultValue={String(tagId(user.academic?.year) ?? '')}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>{tagLabel(opt)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
          <InfoRow label={getFieldLabel('student_id')} value={user.academic?.student_id} />
          <InfoRow label={getFieldLabel('track')} value={tagLabel(user.academic?.track) ?? undefined} />
          <InfoRow label={getFieldLabel('year')} value={tagLabel(user.academic?.year) ?? undefined} />
        </div>
      </EditableSection>

      {/* ── Contact & Social Media (Merged) ── */}
      <EditableSection
        section="contact"
        title="Contact & Social Media"
        serialize={(fd) => fd.set('social_media_json', JSON.stringify(socialMedia))}
        editForm={
          <div className="space-y-6">
            {/* Contact fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={getFieldLabel('phone')} name="phone_number" defaultValue={user.contact?.phone_number} placeholder="08X-XXX-XXXX" />
              <Field label={getFieldLabel('line_id')} name="line_id" defaultValue={user.contact?.line_id} />
            </div>

            <Separator />

            {/* Social media entries */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Social Media</Label>
              {socialMedia.map((item, i) => (
                <div key={i} className="flex gap-2 items-center bg-muted/20 p-3 rounded-lg border">
                  <Input
                    value={item.platform}
                    onChange={e => { const n = [...socialMedia]; n[i] = { ...n[i], platform: e.target.value }; setSocialMedia(n) }}
                    aria-label={`${getFieldLabel('platform')} ${i + 1}`}
                    placeholder={getFieldLabel('platform')}
                    className="flex-1 h-8 text-sm"
                  />
                  <Input
                    value={item.handle}
                    onChange={e => { const n = [...socialMedia]; n[i] = { ...n[i], handle: e.target.value }; setSocialMedia(n) }}
                    aria-label={`${getFieldLabel('handle')} ${i + 1}`}
                    placeholder={getFieldLabel('handle')}
                    className="flex-[2] h-8 text-sm"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSocialMedia(socialMedia.filter((_, j) => j !== i))} aria-label={`Remove social media account ${i + 1}`} className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setSocialMedia([...socialMedia, { platform: '', handle: '' }])}>
                <Plus className="w-4 h-4 mr-2" /> Add Account
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <InfoRow label={getFieldLabel('phone')} value={user.contact?.phone_number} />
            <InfoRow label={getFieldLabel('line_id')} value={user.contact?.line_id} />
          </div>
          {socialMedia.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-3">
                {socialMedia.map((item, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-normal gap-2">
                    <span className="font-semibold text-accent">{item.platform}</span>
                    <span className="opacity-50">|</span>
                    <span>{item.handle}</span>
                  </Badge>
                ))}
              </div>
            </>
          )}
          {socialMedia.length === 0 && (
            <p className="text-muted-foreground italic text-sm">No social media accounts added.</p>
          )}
        </div>
      </EditableSection>

      {/* ── Portfolio ── */}
      <EditableSection
        section="portfolio"
        title="Portfolio"
        serialize={(fd) => fd.set('portfolio_json', JSON.stringify(portfolio))}
        editForm={
          <div className="space-y-3">
            {portfolio.map((item, i) => (
              <div key={i} className="flex gap-2 items-start bg-muted/20 p-3 rounded-lg border">
                 <div className="w-24">
                     <Select
                        value={item.year}
                        onValueChange={val => { const n = [...portfolio]; n[i] = { ...n[i], year: val }; setPortfolio(n) }}
                     >
                        <SelectTrigger aria-label={`Year for activity ${i + 1}`} className="h-9">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                             {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                 </div>
                <div className="flex-1 space-y-2">
                  <Input value={item.activity} onChange={e => { const n = [...portfolio]; n[i] = { ...n[i], activity: e.target.value }; setPortfolio(n) }} aria-label={`${getFieldLabel('activity')} ${i + 1}`} placeholder={getFieldLabel('activity')} className="h-9 text-sm" />
                  <Input value={item.role || ''} onChange={e => { const n = [...portfolio]; n[i] = { ...n[i], role: e.target.value }; setPortfolio(n) }} aria-label={`${getFieldLabel('role')} ${i + 1}`} placeholder={getFieldLabel('role')} className="h-9 text-sm" />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setPortfolio(portfolio.filter((_, j) => j !== i))} aria-label={`Remove activity ${i + 1}`} className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setPortfolio([...portfolio, { year: String(new Date().getFullYear()), activity: '', role: '' }])}>
                <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
          </div>
        }
      >
        {portfolio.length > 0 ? (
          <div className="space-y-3">
            {portfolio.map((item: any, i: number) => (
              <div key={i} className="flex gap-4 items-start pb-3 border-b last:border-0 last:pb-0">
                <Badge variant="outline" className="min-w-[3rem] justify-center">{item.year}</Badge>
                <div>
                  <p className="font-bold text-sm">{item.activity}</p>
                  {item.role && <p className="text-xs text-muted-foreground">{item.role}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">No activities added.</p>
        )}
      </EditableSection>

      {/* ── Interests ── */}
      <EditableSection section="interests" title="Interests"
        editForm={
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {interestOptions.map((opt) => (
              <div key={opt.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`interest-${opt.id}`}
                  name="interests"
                  value={String(opt.id)}
                  defaultChecked={user.interests?.some((i: any) => tagId(i) === Number(opt.id))}
                />
                <Label htmlFor={`interest-${opt.id}`} className="text-sm cursor-pointer">
                  {tagLabel(opt)}
                </Label>
              </div>
            ))}
          </div>
        }
      >
        {/* The checkboxes above are labelled "Workshop (Observe)"; the read view
            used to print the stored `workshop_observe` back at the member. Both
            now read the same tag, so an interest cannot say one thing while you
            are picking it and another once you have. */}
        <div className="flex flex-wrap gap-2">
          {user.interests?.length > 0 ? (
            user.interests.map((i: any, idx: number) => (
              <Badge key={idx} variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/20">
                {tagLabel(i) ?? '—'}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground italic text-sm">No interests selected.</span>
          )}
        </div>
      </EditableSection>
    </div>
  )
}
