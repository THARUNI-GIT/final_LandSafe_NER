import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import dict, { type LangCode, type TranslationKey } from './translations'

const STORAGE_KEY = 'app_language'

interface LanguageContextValue {
  lang: LangCode
  setLang: (lang: LangCode) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function readStoredLang(): LangCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (['en', 'hi', 'as', 'bn', 'ne', 'mni', 'lus', 'kha', 'grt', 'brx', 'trp'].includes(stored || '')) return stored as LangCode
  } catch {
    /* ignore */
  }
  return 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => readStoredLang())

  const setLang = useCallback((next: LangCode) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback((key: TranslationKey) => dict[lang][key] ?? dict.en[key] ?? key, [lang])

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
