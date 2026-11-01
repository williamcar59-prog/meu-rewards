// Cálculos de domínio: saldo, metas, previsão, streak, agregados

import { Account, AppData, Entry } from '../types'
import { addDays, daysBetween, monthStart, todayISO, weekStart } from './dates'

export function accountEntries(data: AppData, accountId: string): Entry[] {
  return data.entries.filter((e) => e.accountId === accountId)
}

export function balanceOf(data: AppData, accountId: string): number {
  let b = 0
  for (const e of data.entries) {
    if (e.accountId !== accountId) continue
    b += e.type === 'earn' ? e.points : -e.points
  }
  return b
}

export function totalBalance(data: AppData): number {
  return data.accounts.reduce((sum, a) => sum + balanceOf(data, a.id), 0)
}

/** Média de pontos ganhos por dia nos últimos N dias (inclui hoje) */
export function avgDailyEarn(data: AppData, accountId: string, windowDays: number): number {
  const from = addDays(todayISO(), -(windowDays - 1))
  const total = data.entries
    .filter((e) => e.accountId === accountId && e.type === 'earn' && e.date >= from)
    .reduce((s, e) => s + e.points, 0)
  return total / windowDays
}

export interface GoalForecast {
  targetPoints: number
  remaining: number
  progress: number // 0..1+
  avg7: number
  avg30: number
  etaDays: number | null // dias restantes pelo ritmo de 7 dias
  etaDate: string | null
  done: boolean
}

export function goalForecast(data: AppData, account: Account): GoalForecast | null {
  if (!account.goal || account.goal.targetPoints <= 0) return null
  const bal = balanceOf(data, account.id)
  const target = account.goal.targetPoints
  const remaining = Math.max(0, target - bal)
  const avg7 = avgDailyEarn(data, account.id, 7)
  const avg30 = avgDailyEarn(data, account.id, 30)
  const etaDays = avg7 > 0 ? Math.ceil(remaining / avg7) : null
  return {
    targetPoints: target,
    remaining,
    progress: Math.min(1, bal / target),
    avg7,
    avg30,
    etaDays,
    etaDate: etaDays !== null ? addDays(todayISO(), etaDays) : null,
    done: remaining === 0,
  }
}

export interface StreakInfo {
  current: number // dias consecutivos com checklist completo (hoje ou desde ontem)
  best: number
  todayDone: boolean
}

/** Streak = dias consecutivos em que TODAS as tarefas diárias habilitadas foram marcadas */
export function streakOf(data: AppData, accountId: string): StreakInfo {
  const account = data.accounts.find((a) => a.id === accountId)
  const dailyTasks = account?.tasks.filter((t) => t.enabled && t.frequency === 'daily') ?? []
  const today = todayISO()

  // contar tarefas marcadas por dia
  const tasksPerDay = new Map<string, Set<string>>()
  for (const e of data.entries) {
    if (e.accountId !== accountId || e.type !== 'earn' || e.source !== 'checklist' || !e.taskId) continue
    if (!tasksPerDay.has(e.date)) tasksPerDay.set(e.date, new Set())
    tasksPerDay.get(e.date)!.add(e.taskId)
  }

  const dayComplete = (iso: string): boolean => {
    if (dailyTasks.length === 0) return false
    const set = tasksPerDay.get(iso)
    if (!set) return false
    return dailyTasks.every((t) => set.has(t.id))
  }

  const todayDone = dayComplete(today)

  // atual: começa hoje (se completo) ou ontem
  let current = 0
  let cursor = todayDone ? today : addDays(today, -1)
  const firstDate = account?.createdAt ?? today
  if (cursor >= firstDate || cursor === firstDate) {
    while (cursor >= firstDate && dayComplete(cursor)) {
      current++
      cursor = addDays(cursor, -1)
    }
  }

  // recorde
  let best = 0
  let run = 0
  const totalDays = daysBetween(firstDate, today) + 1
  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(firstDate, i)
    if (dayComplete(iso)) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
  }

  return { current, best, todayDone }
}

export function earnSum(data: AppData, accountId: string | null, from: string, to?: string): number {
  const end = to ?? todayISO()
  return data.entries
    .filter(
      (e) =>
        e.type === 'earn' &&
        (accountId === null || e.accountId === accountId) &&
        e.date >= from &&
        e.date <= end,
    )
    .reduce((s, e) => s + e.points, 0)
}

export function earnSumToday(data: AppData, accountId: string | null): number {
  return earnSum(data, accountId, todayISO())
}

export function earnSumWeek(data: AppData, accountId: string | null): number {
  return earnSum(data, accountId, weekStart())
}

export function earnSumMonth(data: AppData, accountId: string | null): number {
  return earnSum(data, accountId, monthStart())
}

export interface RedeemSummary {
  totalPoints: number
  totalValue: number // convertido para BRL
  count: number
}

export function redeemSummary(data: AppData, accountId: string | null): RedeemSummary {
  let totalPoints = 0
  let totalValue = 0
  let count = 0
  for (const e of data.entries) {
    if (e.type !== 'redeem') continue
    if (accountId !== null && e.accountId !== accountId) continue
    totalPoints += e.points
    count++
    const acc = data.accounts.find((a) => a.id === e.accountId)
    const rate = acc?.currency === 'USD' ? data.settings.usdBrlRate : 1
    totalValue += (e.value ?? 0) * rate
  }
  return { totalPoints, totalValue, count }
}

/** Valor médio de 1 ponto em BRL, com base nos resgates */
export function pointValueBRL(data: AppData): number | null {
  const s = redeemSummary(data, null)
  if (s.totalPoints <= 0 || s.totalValue <= 0) return null
  return s.totalValue / s.totalPoints
}

export interface TimePoint {
  date: string
  total: number
}

/** Série do saldo total ao longo do tempo (todos os dias desde o primeiro lançamento) */
export function balanceSeries(data: AppData, accountId: string | null): TimePoint[] {
  const entries = data.entries
    .filter((e) => accountId === null || e.accountId === accountId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  if (entries.length === 0) return []

  const first = entries[0].date
  const today = todayISO()
  const totalDays = daysBetween(first, today) + 1

  const perDay = new Map<string, number>()
  for (const e of entries) {
    const delta = e.type === 'earn' ? e.points : -e.points
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + delta)
  }

  const out: TimePoint[] = []
  let acc = 0
  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(first, i)
    acc += perDay.get(iso) ?? 0
    out.push({ date: iso, total: acc })
  }
  return out
}

export interface CategoryPoint {
  name: string
  value: number
}

export function categoryEarns(data: AppData, accountId: string | null, from: string): CategoryPoint[] {
  const map = new Map<string, number>()
  for (const e of data.entries) {
    if (e.type !== 'earn') continue
    if (accountId !== null && e.accountId !== accountId) continue
    if (e.date < from) continue
    map.set(e.label, (map.get(e.label) ?? 0) + e.points)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Ganho por mês dos últimos `months` meses (para gráfico de barras) */
export function monthlyEarns(data: AppData, accountId: string | null, months = 6): { month: string; value: number }[] {
  const today = todayISO()
  const out: { month: string; value: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const value = data.entries
      .filter(
        (e) =>
          e.type === 'earn' &&
          (accountId === null || e.accountId === accountId) &&
          e.date >= start &&
          e.date <= today,
      )
      .reduce((s, e) => s + e.points, 0)
    out.push({ month: start.slice(0, 7), value })
  }
  return out
}
