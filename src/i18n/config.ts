export const defaultLocale = 'en'
export const locales = ['en', 'th'] as const
export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  en: 'English',
  th: 'ไทย',
}
