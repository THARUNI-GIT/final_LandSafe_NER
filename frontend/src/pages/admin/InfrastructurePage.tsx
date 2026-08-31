import { useEffect, useState } from 'react'
import { Hospital, School, Landmark, Home, Zap, Building2 } from 'lucide-react'
import { InfrastructureService } from '../../api/service'
import type { Infrastructure } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState } from '../../components/StatusBadges'

const typeIcons: Record<Infrastructure['type'], any> = {
  HOSPITAL: Hospital,
  SCHOOL: School,
  BRIDGE: Landmark,
  POWER: Zap,
  SHELTER: Home,
  GOVT_OFFICE: Building2,
}

const statusStyles: Record<Infrastructure['status'], string> = {
  OPERATIONAL: 'text-risk-low bg-risk-low/10 border-risk-low/20',
  DAMAGED: 'text-risk-high bg-risk-high/10 border-risk-high/20',
  DESTROYED: 'text-risk-critical bg-risk-critical/10 border-risk-critical/20',
}

const statusOptions: Infrastructure['status'][] = ['OPERATIONAL', 'DAMAGED', 'DESTROYED']

export default function InfrastructurePage() {
  const [infra, setInfra] = useState<Infrastructure[] | null>(null)

  useEffect(() => {
    InfrastructureService.list().then(setInfra)
  }, [])

  async function updateStatus(id: string, status: Infrastructure['status']) {
    const updated = await InfrastructureService.updateStatus(id, status)
    if (updated) setInfra((prev) => prev!.map((f) => (f.id === id ? updated : f)))
  }

  return (
    <div>
      <PageHeader title="Critical Infrastructure" subtitle="Hospitals, shelters, schools & key facilities near risk zones" />
      <div className="p-6">
        {infra === null ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {infra.map((f) => {
              const Icon = typeIcons[f.type]
              return (
                <Card key={f.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg bg-base-panel2 flex items-center justify-center">
                      {Icon && <Icon className="w-4.5 h-4.5 text-blue-400" />}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyles[f.status]}`}>{f.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{f.name}</p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {f.type.replace('_', ' ')} · {f.locationName || f.locationId}
                    {f.district ? ` — ${f.district}, ${f.state}` : ''}
                  </p>
                  <div className="pt-2 border-t border-base-border flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Update status</span>
                    <select
                      value={f.status}
                      onChange={(e) => updateStatus(f.id, e.target.value as Infrastructure['status'])}
                      className="bg-base-panel2 border border-base-border rounded-md text-[11px] px-2 py-1 text-slate-300 focus:outline-none"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
