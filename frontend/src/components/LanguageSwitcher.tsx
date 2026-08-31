import { Languages } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'
import { LANGUAGES } from '../i18n/translations'

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage()

  if (compact) {
    return (
      <div className="relative flex items-center gap-1.5">
        <Languages className="w-3.5 h-3.5 text-slate-500" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as typeof lang)}
          className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-base-panel text-slate-100">
              {l.native}{!l.translated ? ' (English)' : ''}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {LANGUAGES.map((l) => (
        <button
          type="button"
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`text-xs font-medium px-3 py-2.5 rounded-lg border transition-colors ${
            lang === l.code
              ? 'bg-blue-600/15 border-blue-600/40 text-blue-400'
              : 'bg-base-panel2 border-base-border text-slate-400 hover:text-slate-200'
          }`}
        >
          {l.native}{!l.translated ? ' (English)' : ''}
        </button>
      ))}
    </div>
  )
}
