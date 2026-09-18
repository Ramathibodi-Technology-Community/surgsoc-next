'use client'

import React from 'react'
import type { FormFieldBlock } from '@payloadcms/plugin-form-builder/types'
import RadioGroupField from './FormFields/RadioGroupField'
import CheckboxGroupField from './FormFields/CheckboxGroupField'
import SliderField from './FormFields/SliderField'
import RankingField from './FormFields/RankingField'
import UserProfileField from './FormFields/UserProfileField'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RichText } from '@payloadcms/richtext-lexical/react'

/** Extended form field with all block-type-specific properties */
type ExtendedFormField = {
  name: string
  label?: string
  required?: boolean
  blockType: string
  // Standard options (select, radio, checkboxGroup)
  options?: { label: string; value: string }[]
  // checkboxGroup
  minSelect?: number
  maxSelect?: number
  // slider
  variant?: 'rating' | 'stars' | 'slider'
  min?: number
  max?: number
  step?: number
  showLabels?: boolean
  minLabel?: string
  maxLabel?: string
  // radio
  layout?: 'vertical' | 'horizontal'
  // userProfile
  profileField?: string
  readOnly?: boolean
  // message (static richText, no input)
  message?: unknown
  // legacy backward-compat marker on text/number/textarea blocks
  fieldMetadata?: {
    type?: string
  }
}

interface Props {
  field: FormFieldBlock
  value: any
  onChange: (value: any) => void
  user?: any
}

export default function FormField({ field: fieldProp, value, onChange, user }: Props) {
  const field = fieldProp as ExtendedFormField
  const fieldName = field.name || ''
  const label = field.label || fieldName
  const required = field.required

  switch (field.blockType) {
    // ── New first-class block types ─────────────────────────────────────
    case 'radio':
      return (
        <RadioGroupField
          label={label}
          options={field.options || []}
          layout={field.layout}
          value={value}
          onChange={onChange}
          required={required}
        />
      )

    case 'checkboxGroup':
      return (
        <CheckboxGroupField
          label={label}
          options={field.options || []}
          minSelect={field.minSelect}
          maxSelect={field.maxSelect}
          value={value}
          onChange={onChange}
          required={required}
        />
      )

    case 'slider':
      return (
        <SliderField
          label={label}
          variant={field.variant}
          min={field.min}
          max={field.max}
          step={field.step}
          showLabels={field.showLabels}
          minLabel={field.minLabel}
          maxLabel={field.maxLabel}
          value={value}
          onChange={onChange}
          required={required}
        />
      )

    case 'ranking':
      return (
        <RankingField
          label={label}
          options={field.options?.map((o) => o.label) || field.options?.map((o) => o.value) || []}
          value={value}
          onChange={onChange}
          required={required}
        />
      )

    case 'userProfile':
      return (
        <UserProfileField
          label={label}
          profileField={field.profileField || ''}
          readOnly={field.readOnly}
          value={value}
          onChange={onChange}
          required={required}
          user={user}
        />
      )

    // ── Standard block types ────────────────────────────────────────────
    case 'number':
      // Backward compat: old forms stored rating as number + fieldMetadata
      if (field.fieldMetadata?.type === 'rating') {
        return (
          <SliderField
            label={label}
            variant="rating"
            min={1}
            max={5}
            value={value}
            onChange={onChange}
            required={required}
          />
        )
      }
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldName}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="number"
            id={fieldName}
            name={fieldName}
            required={required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'text':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldName}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="text"
            id={fieldName}
            name={fieldName}
            required={required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'textarea':
      // Backward compat: ranking via heuristic
      if (field.fieldMetadata?.type === 'ranking' || fieldName.includes('ranking')) {
        return (
          <RankingField
            label={label}
            options={[]}
            value={value}
            onChange={onChange}
            required={required}
          />
        )
      }
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldName}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id={fieldName}
            name={fieldName}
            required={required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
          />
        </div>
      )

    case 'email':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldName}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="email"
            id={fieldName}
            name={fieldName}
            required={required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldName}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Select
            name={fieldName}
            value={value || ''}
            onValueChange={onChange}
            required={required}
          >
            <SelectTrigger id={fieldName}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt: { label: string; value: string }) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={fieldName}
            name={fieldName}
            required={required}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <Label htmlFor={fieldName} className="font-normal cursor-pointer">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        </div>
      )

    case 'date':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldName}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="date"
            id={fieldName}
            name={fieldName}
            required={required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    // Static content, no input — the editor's richText renders as-is.
    case 'message':
      return field.message ? (
        <RichText
          className="text-muted-foreground"
          data={field.message as React.ComponentProps<typeof RichText>['data']}
        />
      ) : null

    default:
      return null
  }
}
