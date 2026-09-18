'use client'

import React, { createContext, useContext } from 'react'
import { defaultLocale, Locale } from './config'

type Dictionary = Record<string, any>

const I18nContext = createContext<{
  locale: Locale
  dictionary: Dictionary
}>({
  locale: defaultLocale,
  dictionary: {},
})

export function I18nProvider({
  children,
  locale,
  dictionary,
}: {
  children: React.ReactNode
  locale: Locale
  dictionary: Dictionary
}) {
  return (
    <I18nContext.Provider value={{ locale, dictionary }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }

  const { dictionary, locale } = context

  function t(key: string) {
    const keys = key.split('.')
    let current: any = dictionary

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        return key // Fallback to key if not found
      }
    }

    return current as string
  }

  return { t, locale }
}
