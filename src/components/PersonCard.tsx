import React from 'react'
import Record from './Record'

export type PersonSpec = { label: string; value: string }

/**
 * A person, as a Chart record. See design.md § Components.
 *
 * This was a poster-style card — 4:3 photo, name, role — rendered in the same
 * grid as events, advisors and past committees. Four pages, one shape, which is
 * what made the site read as templated. It is now the same mini record as
 * everything else, distinguished only by its fillings: the portrait crops 4:5
 * because faces sit badly in a square, and the ratio quietly marks the kind of
 * record you are looking at.
 *
 * Three lines, in this order: the role in accent on top, then the English name
 * (carrying the nickname in parentheses), then the Thai name. The role leads
 * because it is what a reader scans a roster *by* — you look for the secretary,
 * or the vice president, and read the name once you have found the row. On an
 * event the tag is a classification you read after the name; on a person it is
 * the thing being looked up.
 *
 * A missing Thai name closes the gap rather than reserving it — the portrait,
 * not the text, sets the row height, so the grid stays even.
 *
 * A missing photo drops the slot entirely rather than showing the hatch
 * placeholder used everywhere else — a *person* with no photo on file is not
 * "loading", so there is nothing to stand in for. CSS Grid still keeps the row
 * even: a photo-less card stretches to match any photographed neighbour in the
 * same row, same as `.record` already relies on for uneven card content.
 */
export default function PersonCard({
  imageUrl,
  role,
  name,
  nameThai,
  nickname,
  specs,
  meta,
  className,
}: {
  imageUrl?: string | null
  role?: string
  name: string
  nameThai?: string
  nickname?: string
  /** First spec becomes the trailing meta; the rest belong on a detail page. */
  specs?: PersonSpec[]
  /** Richer trailing line than `specs` allows — contact links, for instance. */
  meta?: React.ReactNode
  /** For the one variant that differs: the secretary's darker fill. */
  className?: string
}) {
  const heading = nickname ? `${name} (${nickname})` : name

  return (
    <Record
      href="#"
      noLink
      title={heading}
      sub={nameThai || null}
      subLang="th"
      tag={role || null}
      tagAccent
      tagFirst
      meta={meta ?? specs?.[0]?.value ?? null}
      // undefined (not null) so Record's hasSlot check skips the slot — a
      // stray "" from the data source is treated the same as no photo.
      imageUrl={imageUrl || undefined}
      portrait
      className={className}
    />
  )
}
