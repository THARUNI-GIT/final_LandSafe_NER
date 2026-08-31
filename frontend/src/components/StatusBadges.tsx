import type { ReactNode } from 'react'
import type { Severity, AlertLevel, RoadStatus } from '../types'

const severityStyles: Record<Severity, string> = {
  LOW: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  MODERATE: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
  HIGH: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  CRITICAL: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${severityStyles[severity]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {severity}
    </span>
  )
}

const alertStyles: Record<AlertLevel, string> = {
  NORMAL: 'bg-slate-600/20 text-slate-300 border-slate-500/30',
  WATCH: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
  PREPARE: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  EVACUATE: 'bg-risk-critical/20 text-risk-critical border-risk-critical/40',
}

export function AlertLevelBadge({ level }: { level: AlertLevel }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wide border ${alertStyles[level]}`}>
      {level}
    </span>
  )
}

const roadStyles: Record<RoadStatus, string> = {
  OPEN: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  PARTIALLY_BLOCKED: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
  BLOCKED: 'bg-risk-high/15 text-risk-high border-risk-high/30',
  DANGEROUS: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
}

export function RoadStatusBadge({ status }: { status: RoadStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${roadStyles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

const sosStyles: Record<'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED', string> = {
  PENDING: 'bg-risk-critical/20 text-risk-critical border-risk-critical/40',
  ACKNOWLEDGED: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
  DISPATCHED: 'bg-blue-600/15 text-blue-400 border-blue-600/30',
  RESOLVED: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  CANCELLED: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
}

export function SOSStatusBadge({ status }: { status: 'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide border ${sosStyles[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={`bg-base-panel border border-base-border rounded-xl ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function LoadingState({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 animate-fade-in">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 animate-fade-in">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  )
}

export function ErrorState({ label = 'Something went wrong', onRetry }: { label?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-risk-critical animate-fade-in">
      <p className="text-sm font-medium">{label}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-xs px-3 py-1.5 rounded-md border border-risk-critical/40 hover:bg-risk-critical/10 transition-colors">
          Retry
        </button>
      )}
    </div>
  )
}
