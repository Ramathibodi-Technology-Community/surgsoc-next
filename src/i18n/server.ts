import { Locale, defaultLocale } from './config'
import 'server-only'

// We'll use a simple import map for server-side stability
const dictionaries = {
  en: () => Promise.all([
    import('./locales/en/common.json'),
    import('./locales/en/events.json'),
    import('./locales/en/account.json'),
    import('./locales/en/forms.json'),
    import('./locales/en/attendings.json'),
    import('./locales/en/team.json'),
    import('./locales/en/terms.json')
  ]).then(([common, events, account, forms, attendings, team, terms]) => ({
    ...common.default,
    events: events.default,
    account: account.default,
    forms: forms.default,
    attendings: attendings.default,
    team: team.default,
    terms: terms.default
  })),
  th: () => Promise.all([
    import('./locales/th/common.json'),
    import('./locales/th/events.json'),
    import('./locales/th/account.json'),
    import('./locales/th/forms.json'),
    import('./locales/th/attendings.json'),
    import('./locales/th/team.json'),
    import('./locales/th/terms.json')
  ]).then(([common, events, account, forms, attendings, team, terms]) => ({
    ...common.default,
    events: events.default,
    account: account.default,
    forms: forms.default,
    attendings: attendings.default,
    team: team.default,
    terms: terms.default
  })),
}

export const getDictionary = async (locale: Locale) => {
  if (typeof dictionaries[locale] === 'function') {
    return dictionaries[locale]()
  }
  return dictionaries[defaultLocale]()
}
