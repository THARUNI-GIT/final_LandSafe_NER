import { User as UserIcon, Mail, Phone, MapPin, Languages } from 'lucide-react'
import { useAuth } from '../../components/AuthContext'
import { Card } from '../../components/StatusBadges'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useLanguage } from '../../i18n/LanguageContext'

export default function CitizenProfile() {
  const { user } = useAuth()
  const { t } = useLanguage()

  const fields = [
    { icon: Mail, label: 'Email', value: user?.email },
    { icon: Phone, label: 'Phone', value: user?.phone ?? 'Not provided' },
    { icon: MapPin, label: 'Location', value: `${user?.district}, ${user?.state}` },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-2xl font-bold text-blue-400 mb-3">
          {user?.name?.slice(0, 2).toUpperCase()}
        </div>
        <p className="text-base font-bold text-slate-100">{user?.name}</p>
        <p className="text-xs text-slate-500">{user?.role}</p>
      </div>

      <Card className="divide-y divide-base-border">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5">
            <Icon className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="text-sm text-slate-200">{value}</p>
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-slate-300">{t('language')}</p>
        </div>
        <LanguageSwitcher />
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <UserIcon className="w-4 h-4 text-blue-500" />
          <p className="text-sm font-semibold text-slate-300">About NE-SAHAYAK</p>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          An AI-powered early-warning platform helping communities across Northeast India stay ahead of landslide risk through predictive analytics and rapid incident verification.
        </p>
      </Card>
    </div>
  )
}
