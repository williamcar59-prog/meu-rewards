// Tipos centrais do Rewards Tracker

export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  name: string
  points: number
  frequency: Frequency
  enabled: boolean
}

export interface Goal {
  name: string
  targetPoints: number
}

export interface Account {
  id: string
  name: string
  region: string // ex.: 'Brasil', 'EUA'
  currency: 'BRL' | 'USD'
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
  value?: number // valor monetário (resgates), na moeda da conta
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
  usdBrlRate: number
}

export interface AppData {
  version: number
  updatedAt: string // ISO datetime — usado para conflito de sync
  accounts: Account[]
  entries: Entry[]
  settings: Settings
}

export const APP_VERSION = 1

export function defaultSettings(): Settings {
  return {
    theme: 'light',
    notifyEnabled: false,
    notifyHour: 20,
    usdBrlRate: 5.5,
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const ACCOUNT_COLORS = [
  '#0067b8', '#744da9', '#00838b', '#ca5010', '#107c10',
  '#d13438', '#c239b3', '#00b7c3', '#986f0b', '#8764b8',
]

export function defaultTasks(): Task[] {
  return [
    { id: uid(), name: 'Pesquisa no PC', points: 36, frequency: 'daily', enabled: true },
    { id: uid(), name: 'Pesquisa no celular', points: 32, frequency: 'daily', enabled: true },
    { id: uid(), name: 'Daily Set (desafios)', points: 30, frequency: 'daily', enabled: true },
    { id: uid(), name: 'Xbox / Game Pass', points: 50, frequency: 'daily', enabled: true },
    { id: uid(), name: 'Edge / Microsoft Start', points: 20, frequency: 'daily', enabled: true },
    { id: uid(), name: 'Missões semanais', points: 100, frequency: 'weekly', enabled: true },
    { id: uid(), name: 'Missões mensais', points: 300, frequency: 'monthly', enabled: true },
  ]
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
