import React from 'react'
import Link from 'next/link'
import { cn } from '@/libs/utils'
import FillImage from './FillImage'
import PosterImage from './PosterImage'
import { marqueeDuration } from '@/libs/marquee'
import StatusMark, { type StatusKey } from './StatusMark'

/**
 * The mini record — the component most of the site is made of.
 * See design.md § Components.
 *
 * `title · tag + meta · right slot · chevron`. The right slot takes an image or
 * a status, and that single substitution is what lets past events, committee
 * members, advisors, forms and account tasks all share one shape. Only the
 * fillings change meaning per element; the arrangement never does.
 *
 * The whole record is one link, so there is no button inside it — an explicit
 * CTA would either compete with the card or nest a second target inside it.
 */
export type RecordProps = {
  href: string
  title: string
  /** English-name records put the Thai name here; events use it for a venue. */
  sub?: string | null
  /** Sub is Thai — needed so the browser can break a spaceless Thai string. */
  subLang?: 'th'
  /** Leading word on the meta line: session type, role, specialty, source. */
  tag?: string | null
  /** Accent the tag. Used where the tag is the identifying fact — a role, a specialty. */
  tagAccent?: boolean
  /**
   * Lift the tag out of the meta row and onto its own line above the title.
   *
   * People records use this. For an event the tag is a classification you read
   * after the name ("Anatomy Review Session", then *Special Lecture*); for a
   * person it is what they *are* to the reader — Secretary, Vice President,
   * Assoc. Prof. — and that is what you scan a roster by, so it leads. It also
   * frees the meta row, which is why an attending's email can sit there without
   * sharing a line with their title and wrapping.
   */
  tagFirst?: boolean
  /** Trailing fact: a date, a department, a campus, a deadline. */
  meta?: React.ReactNode
  /** Right slot, image form. */
  imageUrl?: string | null
  /** Portraits crop 4:5 — faces sit badly in a square, and the ratio marks the kind. */
  portrait?: boolean
  /**
   * Events: lead with the poster in the shared poster slot (5:7, uncropped over
   * a blur), on the left. No poster shows the hatch with the seal. People keep
   * the right-hand slot.
   */
  poster?: boolean
  /** Right slot, status form. Used when the record has no image and never will. */
  status?: StatusKey
  statusLabel?: string
  className?: string
  /** No page to go to — renders as a plain div with no chevron, e.g. person cards. */
  noLink?: boolean
}

export default function Record({
  href,
  title,
  sub,
  subLang,
  tag,
  tagAccent,
  tagFirst,
  meta,
  imageUrl,
  portrait,
  poster,
  status,
  statusLabel,
  className,
  noLink,
}: RecordProps) {
  const hasSlot = Boolean(imageUrl !== undefined || status)
  const leadTag = Boolean(tagFirst && tag)
  // Once the tag has led, the meta row carries only the meta — so there is no
  // separator to strand when a long value wraps.
  const rowTag = tagFirst ? null : tag

  const content = (
    <>
      {poster ? (
        <span className="placeholder-hatch poster-slot record-slot-poster">
          {imageUrl ? <PosterImage src={imageUrl} sizes="52px" /> : null}
        </span>
      ) : null}

      <span className="record-info">
        {leadTag ? (
          <span className={cn('record-tag', tagAccent ? 'text-accent' : 'text-muted-foreground')}>
            {tag}
          </span>
        ) : null}

        <span className="record-title marquee">
          <span>{title}</span>
        </span>

        {/* Missing lines close up — no reserved gap, no dangling separator. */}
        {sub ? (
          <span className="record-sub" lang={subLang} style={{ '--mq-dur': marqueeDuration(sub) } as React.CSSProperties}>
            <span>{sub}</span>
          </span>
        ) : null}

        {(rowTag || meta) && (
          <span className="record-meta">
            {rowTag ? (
              <span className={tagAccent ? 'text-accent font-medium' : 'font-medium'}>{rowTag}</span>
            ) : null}
            {rowTag && meta ? <span className="sep" /> : null}
            {meta}
          </span>
        )}
      </span>

      {poster ? null : status ? (
        <StatusMark status={status} label={statusLabel} />
      ) : hasSlot ? (
        <span
          className={cn('placeholder-hatch record-slot', portrait && 'record-slot-portrait')}
        >
          {imageUrl ? (
            <FillImage src={imageUrl} sizes="80px" />
          ) : null}
        </span>
      ) : null}

      {!noLink && (
        <span aria-hidden="true" className="record-chevron group-hover:text-foreground">
          ›
        </span>
      )}
    </>
  )

  if (noLink) {
    return (
      <div
        className={cn('record', poster && 'record--poster', className)}
        style={{ '--mq-dur': marqueeDuration(title) } as React.CSSProperties}
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn('record group', poster && 'record--poster', className)}
      style={{ '--mq-dur': marqueeDuration(title) } as React.CSSProperties}
    >
      {content}
    </Link>
  )
}
