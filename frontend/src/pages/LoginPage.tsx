import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mountain, LogIn } from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { AuthService } from '../api/service'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLanguage } from '../i18n/LanguageContext'

const demoAccounts = [
  { label: 'citizen', role: 'Citizen', email: 'citizen@demo.in' },
  { label: 'districtAdmin', role: 'District Admin', email: 'district@demo.in' },
  { label: 'stateAdmin', role: 'State Admin', email: 'state@demo.in' },
  { label: 'centralAdmin', role: 'Central Admin (NDMA)', email: 'central@demo.in' },
]

const ADMIN_ROLES = ['DISTRICT_ADMIN', 'STATE_ADMIN', 'CENTRAL_ADMIN']

export default function LoginPage() {
  const [email, setEmail] = useState('citizen@demo.in')
  const [password, setPassword] = useState('password123')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { login, completeGoogleLogin } = useAuth()
  const [params] = useSearchParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  useEffect(() => { const token = params.get('googleToken'); if (token) completeGoogleLogin(token).then((user) => navigate(ADMIN_ROLES.includes(user.role) ? '/admin' : '/citizen')).catch(() => setError('Google login could not be completed.')) }, [params, completeGoogleLogin, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const user = await login(email, password)
      navigate(ADMIN_ROLES.includes(user.role) ? '/admin' : '/citizen')
    } catch {
      setError('Invalid credentials. Try one of the demo accounts below.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-3">
          <LanguageSwitcher compact />
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center mb-4">
            <Mountain className="w-7 h-7 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">{t('appName')}</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">{t('tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-base-panel border border-base-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('signInAs')}</label>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((opt) => (
                <button
                  type="button"
                  key={opt.email}
                  onClick={() => { setEmail(opt.email); setPassword('password123') }}
                  className={`text-xs font-medium px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    email === opt.email
                      ? 'bg-blue-600/15 border-blue-600/40 text-blue-400'
                      : 'bg-base-panel2 border-base-border text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@demo.in"
              className="w-full bg-base-panel2 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-base-panel2 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60"
            />
          </div>

          {error && <p className="text-xs text-risk-critical">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors text-white font-semibold text-sm py-2.5 rounded-lg"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? t('signingIn') : t('signIn')}
          </button>
          <button type="button" onClick={() => { window.location.href = AuthService.googleLoginUrl }} className="w-full border border-base-border hover:bg-base-panel2 text-slate-200 font-semibold text-sm py-2.5 rounded-lg">Continue with Google</button>
          <p className="text-[11px] text-center text-slate-600">{t('demoHint')}</p>
        </form>
      </div>
    </div>
  )
}
