// Cálculos de domínio: saldo por check-in, sequência, peças e relatório mensal

import { AppData, CheckIn, Redemption } from '../types'
import { addDays, daysBetween, todayISO } from './dates'

const pad = (n: number) => String(n).padStart(2, '0')

// ---------------------------------------------------------------- Check-ins

export function accountCheckIns(data: AppData, accountId: string): CheckIn[] {
  return data.checkIns
    .filter((c) => c.accountId === accountId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

function checkInDates(data: AppData, accountId: string): Set<string> {
  const s = new Set<string>()
  for (const c of data.checkIns) if (c.accountId === accountId) s.add(c.date)
  return s
}

/** Saldo conhecido em uma data (último check-in até essa data, menos resgates posteriores) */
export function balanceAt(data: AppData, accountId: string, date: string): number {
  const acc = data.accounts.find((a) => a.id === accountId)
  let last: CheckIn | null = null
  for (const c of data.checkIns) {
    if (c.accountId !== accountId || c.date > date) continue
    if (!last || c.date > last.date) last = c
  }
  let balance = last ? last.balance : acc?.openingBalance ?? 0

  // resgates feitos DEPOIS do último check-in ainda não estão no saldo registrado
  for (const r of data.redemptions) {
    if (r.accountId !== accountId || r.date > date) continue
    const afterLast = last ? r.date > last.date : r.date >= (acc?.createdAt ?? r.date)
    if (afterLast) balance -= r.points
  }
  return balance
}

/** Saldo atual da conta (último check-in + resgates posteriores, ou saldo de abertura) */
export function currentBalance(data: AppData, accountId: string): number {
  return balanceAt(data, accountId, todayISO())
}

export function totalBalance(data: AppData): number {
  return data.accounts.reduce((s, a) => s + currentBalance(data, a.id), 0)
}

export function checkedInOn(data: AppData, accountId: string, date: string): boolean {
  return data.checkIns.some((c) => c.accountId === accountId && c.date === date)
}

// ---------------------------------------------------------------- Sequência

function streakEndingBefore(
  dates: Set<string>,
  createdAt: string,
  beforeDate: string,
  opening: number,
): number {
  if (beforeDate <= createdAt) return 0
  let count = 0
  let cursor = addDays(beforeDate, -1)
  while (cursor >= createdAt && dates.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  if (cursor < createdAt) count += opening
  return count
}

export interface StreakInfo {
  current: number
  best: number
  todayDone: boolean
}

export function streakOf(data: AppData, accountId: string): StreakInfo {
  const acc = data.accounts.find((a) => a.id === accountId)
  const createdAt = acc?.createdAt ?? todayISO()
  const opening = acc?.openingStreak ?? 0
  const dates = checkInDates(data, accountId)
  const today = todayISO()

  const todayDone = dates.has(today)
  const current = streakEndingBefore(dates, createdAt, todayDone ? addDays(today, 1) : today, opening)

  let best = opening
  let run = 0
  let leading = 0
  const total = daysBetween(createdAt, today) + 1
  for (let i = 0; i < total; i++) {
    const iso = addDays(createdAt, i)
    if (dates.has(iso)) {
      run++
      if (run > best) best = run
      if (i === leading) leading++
    } else {
      run = 0
    }
  }
  if (leading > 0) best = Math.max(best, opening + leading)

  return { current, best, todayDone }
}

// ---------------------------------------------------------------- Peças de quebra-cabeça

/** Peças necessárias para completar o troféu. */
export const PIECE_GOAL = 12
/** Pontos ganhos ao completar o troféu (a cada 12 peças). */
export const PIECE_REWARD = 1000

/** Total de peças da conta (abertura + check-ins). accountId null = todas as contas. */
export function piecesTotal(data: AppData, accountId: string | null): number {
  const opening =
    accountId === null
      ? data.accounts.reduce((s, a) => s + (a.openingPieces || 0), 0)
      : data.accounts.find((a) => a.id === accountId)?.openingPieces ?? 0
  const fromCheckIns = data.checkIns
    .filter((c) => accountId === null || c.accountId === accountId)
    .reduce((s, c) => s + (c.pieces || 0), 0)
  return opening + fromCheckIns
}

export interface PuzzleProgress {
  total: number // total de peças já ganhas
  filled: number // peças do troféu atual (0..PIECE_GOAL)
  completed: number // troféus já completos
  toNext: number // peças que faltam para o próximo troféu
  isComplete: boolean // troféu atual completo (premia +1.000)
}

/** Progresso do troféu: 12 peças completam um troféu e valem 1.000 pontos. */
export function puzzleProgress(data: AppData, accountId: string | null): PuzzleProgress {
  const total = piecesTotal(data, accountId)
  const filled = total === 0 ? 0 : ((total - 1) % PIECE_GOAL) + 1
  const completed = Math.floor(total / PIECE_GOAL)
  const isComplete = filled === PIECE_GOAL
  const mod = total % PIECE_GOAL
  const toNext = total === 0 ? PIECE_GOAL : mod === 0 ? 0 : PIECE_GOAL - mod
  return { total, filled, completed, toNext, isComplete }
}

export function piecesInMonth(data: AppData, accountId: string, first: string, last: string): number {
  return data.checkIns
    .filter((c) => c.accountId === accountId && c.date >= first && c.date <= last)
    .reduce((s, c) => s + (c.pieces || 0), 0)
}

// ---------------------------------------------------------------- Mês / relatório

export interface MonthBounds {
  year: number
  month: number // 1-12
  first: string
  last: string
  prevLast: string // último dia do mês anterior
  days: number
}

export function monthBounds(year: number, month: number): MonthBounds {
  const days = new Date(year, month, 0).getDate() // dia 0 do mês seguinte
  const first = `${year}-${pad(month)}-01`
  const last = `${year}-${pad(month)}-${pad(days)}`
  const prevY = month === 1 ? year - 1 : year
  const prevM = month === 1 ? 12 : month - 1
  const prevDays = new Date(prevY, prevM, 0).getDate()
  const prevLast = `${prevY}-${pad(prevM)}-${pad(prevDays)}`
  return { year, month, first, last, prevLast, days }
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

export function monthLabelPt(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export interface MonthlyReport {
  startBalance: number // saldo no fim do mês anterior
  endBalance: number // saldo no fim deste mês (ou atual, se corrente)
  redeemed: number // pontos resgatados no mês
  netEarned: number // pontos realmente obtidos no mês
  pieces: number // peças ganhas no mês
  daysChecked: number // dias com check-in
}

/**
 * Relatório do mês (ciclo calendário — fecha no dia 1, quando o Game Pass renova).
 * Ganho líquido = (saldo final − saldo inicial) + pontos resgatados no mês.
 */
export function monthlyReport(data: AppData, accountId: string, year: number, month: number): MonthlyReport {
  const { first, last, prevLast } = monthBounds(year, month)

  const startBalance = balanceAt(data, accountId, prevLast)
  const endBalance = balanceAt(data, accountId, last)

  let redeemed = 0
  for (const r of data.redemptions) {
    if (r.accountId === accountId && r.date >= first && r.date <= last) redeemed += r.points
  }

  let pieces = 0
  let daysChecked = 0
  for (const c of data.checkIns) {
    if (c.accountId !== accountId || c.date < first || c.date > last) continue
    pieces += c.pieces || 0
    daysChecked++
  }

  const netEarned = endBalance - startBalance + redeemed
  return { startBalance, endBalance, redeemed, netEarned, pieces, daysChecked }
}

/** Ganho líquido somado de todas as contas no mês */
export function totalMonthlyReport(data: AppData, year: number, month: number): MonthlyReport {
  const reports = data.accounts.map((a) => monthlyReport(data, a.id, year, month))
  return reports.reduce<MonthlyReport>(
    (acc, r) => ({
      startBalance: acc.startBalance + r.startBalance,
      endBalance: acc.endBalance + r.endBalance,
      redeemed: acc.redeemed + r.redeemed,
      netEarned: acc.netEarned + r.netEarned,
      pieces: acc.pieces + r.pieces,
      daysChecked: acc.daysChecked + r.daysChecked,
    }),
    { startBalance: 0, endBalance: 0, redeemed: 0, netEarned: 0, pieces: 0, daysChecked: 0 },
  )
}

/** Série de ganho líquido dos últimos N meses (para gráfico) */
export function monthlyNetSeries(
  data: AppData,
  months = 6,
): { month: string; value: number; redeemed: number }[] {
  const now = new Date()
  const out: { month: string; value: number; redeemed: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const rep = totalMonthlyReport(data, y, m)
    out.push({ month: `${y}-${pad(m)}`, value: rep.netEarned, redeemed: rep.redeemed })
  }
  return out
}

// ---------------------------------------------------------------- Gráficos / meta

export interface TimePoint {
  date: string
  total: number
  redeemed: number // pontos resgatados nesse dia (0 se houve)
}

/** Série do saldo somado ao longo do tempo (a partir dos check-ins) */
export function balanceSeries(data: AppData, accountId: string | null): TimePoint[] {
  const accounts = data.accounts.filter((a) => accountId === null || a.id === accountId)
  if (accounts.length === 0) return []

  const today = todayISO()
  let start = today
  for (const acc of accounts) {
    if (acc.createdAt < start) start = acc.createdAt
    for (const c of data.checkIns) {
      if (c.accountId === acc.id && c.date < start) start = c.date
    }
  }

  const total = daysBetween(start, today) + 1
  const out: TimePoint[] = []
  for (let i = 0; i < total; i++) {
    const iso = addDays(start, i)
    let sum = 0
    for (const acc of accounts) {
      if (iso < acc.createdAt) continue
      sum += balanceAt(data, acc.id, iso)
    }
    out.push({ date: iso, total: sum, redeemed: redemptionsOn(data, accountId, iso) })
  }
  return out
}

// ---------------------------------------------------------------- Resgates

/** Pontos resgatados em um dia específico (accountId null = todas as contas). */
export function redemptionsOn(data: AppData, accountId: string | null, date: string): number {
  let sum = 0
  for (const r of data.redemptions) {
    if (r.date !== date) continue
    if (accountId !== null && r.accountId !== accountId) continue
    sum += r.points
  }
  return sum
}

/** Resgates de um intervalo de datas (usado no relatório do mês). */
export function redemptionsBetween(
  data: AppData,
  accountId: string | null,
  first: string,
  last: string,
): Redemption[] {
  return data.redemptions.filter(
    (r) =>
      r.date >= first &&
      r.date <= last &&
      (accountId === null || r.accountId === accountId),
  )
}

export interface RedeemSummary {
  totalPoints: number
  count: number
}

export function redeemSummary(data: AppData, accountId: string | null): RedeemSummary {
  let totalPoints = 0
  let count = 0
  for (const r of data.redemptions) {
    if (accountId !== null && r.accountId !== accountId) continue
    totalPoints += r.points
    count++
  }
  return { totalPoints, count }
}
