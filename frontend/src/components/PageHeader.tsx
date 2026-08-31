import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 h-16 border-b border-base-border bg-base-panel/60 sticky top-0 z-10 backdrop-blur">
      <div>
        <h1 className="text-base font-bold text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
