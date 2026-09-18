import React from 'react'

/**
 * The standard opening of every page: display title, standfirst. Left-aligned
 * and measure-limited — the design centres nothing, and a lead running the full
 * 1100px would be unreadable.
 *
 * There is deliberately no `eyebrow` prop. Every page had one, and six of the
 * eight simply restated the nav item the reader had just clicked ("Team" above
 * "Our Team"). A label above every title labels nothing. The two eyebrows left
 * on the site carry real content — provenance on the home page, accept/decline
 * status on the attendance page — and set their own class directly.
 *
 * `aside` sits on the baseline of the lead for page-level controls (a year
 * picker, a filter) so those never need their own row.
 */
export default function PageHeader({
  title,
  lead,
  aside,
}: {
  title: string
  lead?: string
  aside?: React.ReactNode
}) {
  return (
    <header className="mb-9">
      <h1 className="type-h1 mb-3 max-w-[24ch]">{title}</h1>
      {(lead || aside) && (
        <div className="flex flex-wrap items-end gap-6">
          {lead && <p className="type-lead m-0 max-w-[56ch] flex-[1_1_320px]">{lead}</p>}
          {/* ml-auto, not flex-grow on the lead — the lead is measure-capped at
              56ch, so a short one would otherwise leave the aside stranded
              mid-row instead of against the right edge. */}
          {aside && <div className="ml-auto">{aside}</div>}
        </div>
      )}
    </header>
  )
}
