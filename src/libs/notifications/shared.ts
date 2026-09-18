const LOCAL_BASE_URL = 'http://localhost:3000'

type EnvMap = Record<string, string | undefined>

type UserLike = {
  email?: string | null
  name_english?: {
    first_name?: string | null
  } | null
}

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function getNotificationBaseUrl(env: EnvMap = process.env): string {
  const baseUrl = env.NEXT_PUBLIC_SERVER_URL

  if (!baseUrl && env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SERVER_URL is required in production for email links')
  }

  return trimTrailingSlash(baseUrl || LOCAL_BASE_URL)
}

export function getPreferredRecipientName(user: UserLike): string {
  return user.name_english?.first_name || user.email || 'Member'
}

export function formatNotificationDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString()
}

export function getRegistrationDecisionUrls(
  baseUrl: string,
  eventId: string | number,
  registrationId: string | number,
): { confirmUrl: string; declineUrl: string } {
  return {
    confirmUrl: `${baseUrl}/events/${eventId}/confirm?registrationId=${registrationId}`,
    declineUrl: `${baseUrl}/events/${eventId}/decline?registrationId=${registrationId}`,
  }
}

export function getFormAssignmentUrl(baseUrl: string, formId: string | number): string {
  return `${baseUrl}/forms/${formId}`
}
