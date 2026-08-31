import { useEffect, useState } from 'react'
import { Route as RouteIcon, ArrowRightLeft } from 'lucide-react'
import { RoadService, LocationService } from '../../api/service'
import type { Road, Location } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, RoadStatusBadge, SeverityBadge } from '../../components/StatusBadges'

export default function RoadsPage() {
  const [roads, setRoads] = useState<Road[] | null>(null)
  const [locations, setLocations] = useState<Record<string, Location>>({})

  useEffect(() => {
    RoadService.list().then(setRoads)
    LocationService.list().then((locs) => setLocations(Object.fromEntries(locs.map((l) => [l.id, l]))))
  }, [])

  return (
    <div>
      <PageHeader title="Road Network Status" subtitle="Impact on transport routes near risk zones" />
      <div className="p-6">
        {roads === null ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {roads.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-base-panel2 flex items-center justify-center">
                      <RouteIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{locations[r.locationId]?.name ?? r.locationId}</p>
                    </div>
                  </div>
                  <RoadStatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-base-border">
                  <SeverityBadge severity={r.risk} />
                  {r.alternateRoute && (
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" /> {r.alternateRoute}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
