// Cálculos de domínio: saldo, metas, previsão, streak, ciclo de 7 dias, agregados

import { Account, AppData, Entry, Task } from '../types'
import { builtinPoints, GamePassPlan } from '../data/rewardsTable'
import { addDays, daysBetween, monthStart, todayISO, weekStart } from './dates'

export function accountEntries(data: AppData, accountId: string): Entry[] {
  return data.entries.filter((e) => e.accountId === accountId)
}

export function balanceOf(data: AppData, accountId: string): number {
  const account = data.accounts.find((a) => a.id === accountId)
  let b = account?.openingBalance ?? 0
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

// ---------------------------------------------------------------- Checklist / streak / ciclo

function makeDayComplete(data: AppData, accountId: string): (iso: string) => boolean {
  const account = data.accounts.find((a) => a.id === accountId)
  const dailyTasks = account?.tasks.filter((t) => t.enabled && t.frequency === 'daily') ?? []
  const tasksPerDay = new Map<string, Set<string>>()
  for (const e of data.entries) {
    if (e.accountId !== accountId || e.type !== 'earn' || e.source !== 'checklist' || !e.taskId) continue
    if (!tasksPerDay.has(e.date)) tasksPerDay.set(e.date, new Set())
    tasksPerDay.get(e.date)!.add(e.taskId)
  }
  return (iso: string): boolean => {
    if (dailyTasks.length === 0) return false
    const set = tasksPerDay.get(iso)
    if (!set) return false
    return dailyTasks.every((t) => set.has(t.id))
  }
}

/**
 * Dias consecutivos completos estritamente ANTES de `beforeDate`,
 * caminhando até `createdAt`. Se todos os dias rastreados estiverem
 * completos, soma a `openingStreak` (dias anteriores ao cadastro).
 */
function streakEndingBefore(
  dayComplete: (iso: string) => boolean,
  createdAt: string,
  beforeDate: string,
  openingStreak: number,
): number {
  if (beforeDate <= createdAt) return 0
  let count = 0
  let cursor = addDays(beforeDate, -1)
  while (cursor >= createdAt && dayComplete(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  if (cursor < createdAt) count += openingStreak
  return count
}

/** Dia do ciclo de 7 dias (1..7) para uma data — usado nas tarefas do Bing */
export function cycleDayFor(data: AppData, accountId: string, date: string): number {
  const account = data.accounts.find((a) => a.id === accountId)
  if (!account) return 1
  const dayComplete = makeDayComplete(data, accountId)
  const streakBefore = streakEndingBefore(
    dayComplete,
    account.createdAt,
    date,
    account.openingStreak,
  )
  return (streakBefore % 7) + 1
}

export interface StreakInfo {
  current: number // dias consecutivos completos (inclui openingStreak)
  best: number
  todayDone: boolean
  cycleDay: number // dia do ciclo de 7 (1..7) para hoje
}

export function streakOf(data: AppData, accountId: string): StreakInfo {
  const account = data.accounts.find((a) => a.id === accountId)
  const createdAt = account?.createdAt ?? todayISO()
  const openingStreak = account?.openingStreak ?? 0
  const dayComplete = makeDayComplete(data, accountId)
  const today = todayISO()

  const todayDone = dayComplete(today)

  // atual: inclui hoje (se completo) ou começa em ontem
  const beforeDate = todayDone ? addDays(today, 1) : today
  const current = streakEndingBefore(dayComplete, createdAt, beforeDate, openingStreak)

  // recorde
  let best = openingStreak
  let run = 0
  const totalDays = daysBetween(createdAt, today) + 1
  let leadingRun = 0
  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(createdAt, i)
    if (dayComplete(iso)) {
      run++
      if (run > best) best = run
      if (i === leadingRun) leadingRun++
    } else {
      run = 0
    }
  }
  // o primeiro trecho conecta com a sequência de abertura
  if (leadingRun > 0) best = Math.max(best, openingStreak + leadingRun)

  const cycleDay = (streakEndingBefore(dayComplete, createdAt, today, openingStreak) % 7) + 1

  return { current, best, todayDone, cycleDay }
}

/** Pontos efetivos de uma tarefa (tabela para oficiais, valor fixo p/ personalizadas) */
export function taskPoints(task: Task, plan: GamePassPlan, cycleDay: number): number {
  return task.builtin ? builtinPoints(task.builtin, plan, cycleDay) : task.points
}

// ---------------------------------------------------------------- Agregados

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
  count: number
}

export function redeemSummary(data: AppData, accountId: string | null): RedeemSummary {
  let totalPoints = 0
  let count = 0
  for (const e of data.entries) {
    if (e.type !== 'redeem') continue
    if (accountId !== null && e.accountId !== accountId) continue
    totalPoints += e.points
    count++
  }
  return { totalPoints, count }
}

export interface TimePoint {
  date: string
  total: number
}

/** Série do saldo ao longo do tempo (considera saldo de abertura de cada conta) */
export function balanceSeries(data: AppData, accountId: string | null): TimePoint[] {
  const accounts = data.accounts.filter((a) => accountId === null || a.id === accountId)
  if (accounts.length === 0) return []

  const perAccount = accounts.map((acc) => {
    const map = new Map<string, number>()
    for (const e of data.entries) {
      if (e.accountId !== acc.id) continue
      const delta = e.type === 'earn' ? e.points : -e.points
      map.set(e.date, (map.get(e.date) ?? 0) + delta)
    }
    return { acc, map }
  })

  const today = todayISO()
  let start = today
  for (const { acc, map } of perAccount) {
    if (acc.createdAt < start) start = acc.createdAt
    for (const k of map.keys()) if (k < start) start = k
  }

  const totalDays = daysBetween(start, today) + 1
  const running = new Map<string, number>()
  const started = new Set<string>()
  const out: TimePoint[] = []

  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(start, i)
    let dayTotal = 0
    for (const { acc, map } of perAccount) {
      if (!started.has(acc.id) && iso >= acc.createdAt) {
        running.set(acc.id, acc.openingBalance ?? 0)
        started.add(acc.id)
      }
      if (started.has(acc.id)) {
        const next = running.get(acc.id)! + (map.get(iso) ?? 0)
        running.set(acc.id, next)
        dayTotal += next
      }
    }
    out.push({ date: iso, total: dayTotal })
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
