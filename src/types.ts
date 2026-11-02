// Tipos centrais do Meu Rewards — modelo de check-in diário

import { GamePassPlan } from './data/rewardsTable'

export interface Account {
  id: string
  name: string
  region: string // ex.: 'Brasil', 'EUA'
  plan: GamePassPlan // plano do Game Pass (referência)
  openingBalance: number // saldo (pontos) quando a conta foi criada
  openingStreak: number // sequência (dias) quando a conta foi criada
  color: string
  createdAt: string // ISO date YYYY-MM-DD
}

/** Check-in diário: você registra o saldo do dia (e as peças ganhas). */
export interface CheckIn {
  id: string
  accountId: string
  date: string // YYYY-MM-DD
  balance: number // saldo em pontos ao fim do dia
  pieces: number // peças de quebra-cabeça ganhas neste dia (0-4)
  createdAt: string // ISO datetime
}

/** Resgate: quando você usa pontos, registra quanto e em que. */
export interface Redemption {
  id: string
  accountId: string
  date: string // YYYY-MM-DD
  points: number // pontos usados (sempre positivo)
  usedFor: string // onde foi usado (ex.: Game Pass, Gift Card)
  createdAt: string // ISO datetime
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
  checkIns: CheckIn[]
  redemptions: Redemption[]
  settings: Settings
}

export const APP_VERSION = 3

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

function normalizeAccount(a: Partial<Account>): Account {
  return {
    id: a.id ?? uid(),
    name: a.name ?? 'Conta',
    region: a.region ?? 'Brasil',
    plan: (a.plan as GamePassPlan) ?? 'NONE',
    openingBalance: a.openingBalance ?? 0,
    openingStreak: a.openingStreak ?? 0,
    color: a.color ?? ACCOUNT_COLORS[0],
    createdAt: a.createdAt ?? new Date().toISOString().slice(0, 10),
  }
}

/** Normaliza dados vindos de versões antigas (IndexedDB/OneDrive/backup). */
export function normalizeData(raw: Partial<AppData> & { entries?: unknown }): AppData {
  // versões antigas guardavam tudo em `entries` — migra resgates
  let redemptions: Redemption[] = Array.isArray(raw.redemptions) ? raw.redemptions : []
  if (!Array.isArray(raw.redemptions) && Array.isArray(raw.entries)) {
    for (const e of raw.entries as Record<string, unknown>[]) {
      if (e.type === 'redeem') {
        redemptions.push({
          id: (e.id as string) ?? uid(),
          accountId: e.accountId as string,
          date: e.date as string,
          points: Number(e.points) || 0,
          usedFor: (e.label as string) || 'Recompensa',
          createdAt: (e.createdAt as string) ?? new Date().toISOString(),
        })
      }
    }
  }

  return {
    version: APP_VERSION,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    accounts: Array.isArray(raw.accounts) ? raw.accounts.map(normalizeAccount) : [],
    checkIns: Array.isArray(raw.checkIns) ? raw.checkIns : [],
    redemptions,
    settings: { ...defaultSettings(), ...(raw.settings ?? {}) },
  }
}

export function emptyData(): AppData {
  return {
    version: APP_VERSION,
    updatedAt: new Date().toISOString(),
    accounts: [],
    checkIns: [],
    redemptions: [],
    settings: defaultSettings(),
  }
}
