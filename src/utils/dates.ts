// Utilitários de data (tudo em fuso local, formato YYYY-MM-DD)

export function todayISO(): string {
  const d = new Date()
  return toISO(d)
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = isoToDate(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Diferença em dias (b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000)
}

export function fmtDate(iso: string): string {
  return isoToDate(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fmtDateShort(iso: string): string {
  return isoToDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Semana começando na segunda-feira */
export function weekStart(today = todayISO()): string {
  const d = isoToDate(today)
  const dow = (d.getDay() + 6) % 7 // 0 = segunda
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

export function monthStart(today = todayISO()): string {
  const d = isoToDate(today)
  d.setDate(1)
  return toISO(d)
}

export function monthLabel(iso: string): string {
  return isoToDate(iso + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}
