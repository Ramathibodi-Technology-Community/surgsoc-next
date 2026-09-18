type SchedulableResource = {
  opens_at?: string | Date | null
  closes_at?: string | Date | null
  status_override?: 'auto' | 'open' | 'closed' | null
}

export const ResourceScheduling = {
  /**
   * schema:
   * - status_override: 'auto' | 'open' | 'closed'
   * - opens_at: Date
   * - closes_at: Date
   *
   * Logic:
   * 1. Force Closed -> Closed
   * 2. Force Open -> Open
   * 3. Auto -> Check dates
   */
  isOpen(resource: SchedulableResource): { isOpen: boolean; reason?: 'closed' | 'not_open_yet' | 'force_closed' } {
    const { opens_at, closes_at, status_override } = resource

    // 1. Force Override
    if (status_override === 'closed') return { isOpen: false, reason: 'force_closed' }
    if (status_override === 'open') return { isOpen: true }

    // 2. Time-based Logic
    const now = new Date()
    const start = opens_at ? new Date(opens_at) : null
    const end = closes_at ? new Date(closes_at) : null

    if (start && now < start) {
      return { isOpen: false, reason: 'not_open_yet' }
    }

    if (end && now > end) {
      return { isOpen: false, reason: 'closed' }
    }

    return { isOpen: true }
  },

  getStatusMessage(resource: SchedulableResource): string | null {
      const status = this.isOpen(resource)
      if (status.isOpen) return null

      if (resource.status_override === 'closed') return 'Closed'

      /*
        A bare `toLocaleString()` takes the *server's* locale and zone, which
        printed "Closed at 9/14/2026, 9:57:39 AM" on a site that writes every
        other date as "Sun 14 Sept, 09:57" in Bangkok time — and to the second,
        which nothing here is accurate to. Same formatter arguments as
        `formatEventDuration`, so the two agree on the same page.

        Tense does the work that a second colour would otherwise do: "opens" for
        a window still ahead, "closed" for one behind.
      */
      const when = (value: string | Date) =>
        new Date(value).toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Bangkok',
        })

      if (status.reason === 'not_open_yet' && resource.opens_at) {
          return `Opens ${when(resource.opens_at)}`
      }

      if (status.reason === 'closed' && resource.closes_at) {
          return `Closed ${when(resource.closes_at)}`
      }

      return 'Closed'
  }
}
