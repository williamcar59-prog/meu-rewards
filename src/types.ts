// Tipos centrais do Rewards Tracker

import { BUILTIN_TASKS, GamePassPlan } from './data/rewardsTable'

export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  name: string
  points: number // usado apenas em tarefas personalizadas (as oficiais usam a tabela)
  frequency: Frequency
  enabled: boolean
  /** id da tarefa oficial (rewardsTable) — quando presente, os pontos vêm da tabela */
  builtin?: string
}

export interface Goal {
  name: string
  targetPoints: number
}

export interface Account {
  id: string
  name: string
  region: string // ex.: 'Brasil', 'EUA'
  plan: GamePassPlan // plano do Game Pass (afeta pontuação Xbox / bônus)
  openingBalance: number // saldo atual (em pontos) quando a conta foi criada
  openingStreak: number // sequência atual (dias) quando a conta foi criada
  color: string
  goal: Goal | null
  tasks: Task[]
  createdAt: string // ISO date YYYY-MM-DD
}

export type EntryType = 'earn' | 'redeem'
export type EntrySource = 'manual' | 'checklist'

export interface Entry {
  id: string
  accountId: string
  type: EntryType
  points: number // sempre positivo
  label: string // categoria (ganhos) ou nome da recompensa (resgates)
  date: string // YYYY-MM-DD
  createdAt: string // ISO datetime
  source: EntrySource
  taskId?: string
}

export interface Settings {
  theme: 'light' | 'dark'
  notifyEnabled: boolean
  notifyHour: number // 0-23
}

export interface AppData {
  version: number
  updatedAt: string // ISO datetime — usado para conflito de sync
  accounts: Account[]
  entries: Entry[]
  settings: Settings
}

export const APP_VERSION = 2

export function defaultSettings(): Settings {
  return {
    theme: 'light',
    notifyEnabled: false,
    notifyHour: 20,
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const ACCOUNT_COLORS = [
  '#0067b8', '#744da9', '#00838b', '#ca5010', '#107c10',
  '#d13438', '#c239b3', '#00b7c3', '#986f0b', '#8764b8',
]

/** Tarefas padrão = todas as oficiais da tabela, habilitadas */
export function defaultTasks(): Task[] {
  return BUILTIN_TASKS.map((b) => ({
    id: b.id,
    name: b.name,
    points: 0,
    frequency: b.frequency,
    enabled: true,
    builtin: b.id,
  }))
}

/** Garante campos novos e injeta as tarefas oficiais em contas antigas */
function normalizeAccount(a: Partial<Account>): Account {
  const existing = Array.isArray(a.tasks) ? a.tasks : []
  const have = new Set(existing.map((t) => t.builtin).filter(Boolean) as string[])
  const injected: Task[] = BUILTIN_TASKS.filter((b) => !have.has(b.id)).map((b) => ({
    id: b.id,
    name: b.name,
    points: 0,
    frequency: b.frequency,
    enabled: true,
    builtin: b.id,
  }))
  return {
    id: a.id ?? uid(),
    name: a.name ?? 'Conta',
    region: a.region ?? 'Brasil',
    plan: (a.plan as GamePassPlan) ?? 'NONE',
    openingBalance: a.openingBalance ?? 0,
    openingStreak: a.openingStreak ?? 0,
    color: a.color ?? ACCOUNT_COLORS[0],
    goal: a.goal ?? null,
    tasks: [...injected, ...existing],
    createdAt: a.createdAt ?? new Date().toISOString().slice(0, 10),
  }
}

/** Normaliza dados vindos do IndexedDB/OneDrive/backup (versões antigas) */
export function normalizeData(raw: AppData): AppData {
  return {
    version: APP_VERSION,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    accounts: Array.isArray(raw.accounts) ? raw.accounts.map(normalizeAccount) : [],
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    settings: { ...defaultSettings(), ...(raw.settings ?? {}) },
  }
}

export function emptyData(): AppData {
  return {
    version: APP_VERSION,
    updatedAt: new Date().toISOString(),
    accounts: [],
    entries: [],
    settings: defaultSettings(),
  }
}
