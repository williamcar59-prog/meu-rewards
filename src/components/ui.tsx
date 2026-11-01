// Componentes de UI compartilhados

import React from 'react'

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Progress({ value, green }: { value: number; green?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`progress${green ? ' green' : ''}`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Empty({
  icon,
  title,
  text,
}: {
  icon?: React.ReactNode
  title: string
  text?: string
}) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  )
}

export const fmtPoints = (n: number): string =>
  Math.round(n).toLocaleString('pt-BR')

export const fmtDateShort = (iso: string): string => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
