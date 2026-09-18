'use client'

import React from 'react'

export const MembersCell: React.FC<any> = ({ cellData }) => {
  if (!cellData || !Array.isArray(cellData) || cellData.length === 0) {
    return <span>-</span>
  }

  // Payload relationship fields populate with the related document by default in list views (if depth >= 1)
  // or return an array of IDs if depth is 0. Payload's list view usually fetches depth=1.

  const membersCount = cellData.length
  const preview = cellData.slice(0, 3)

  const names = preview.map((user: any) => {
    if (typeof user === 'string' || typeof user === 'number') {
      return `User ID: ${user}`
    }
    // Prefer English name, fallback to Thai name, fallback to email
    return user.name_english || user.name_thai || user.email || 'Unknown User'
  }).join(', ')

  if (membersCount > 3) {
    return <span>{names}, and {membersCount - 3} more</span>
  }

  return <span>{names}</span>
}
