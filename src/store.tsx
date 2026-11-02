// Store global: estado + ações + persistência (IndexedDB + sync de arquivo)

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  ACCOUNT_COLORS,
  Account,
  AppData,
  CheckIn,
  Redemption,
  Settings,
  emptyData,
  normalizeData,
  uid,
} from './types'
import { GamePassPlan } from './data/rewardsTable'
import {
  clearSyncHandle,
  getSyncHandle,
  hasWritePermission,
  loadLocalData,
  pickSyncFile,
  readFromFile,
  requestWritePermission,
  saveLocalData,
  writeToFile,
} from './utils/storage'
import { todayISO } from './utils/dates'

interface StoreValue {
  data: AppData
  ready: boolean
  syncFileName: string | null
  syncError: string | null
  update: (fn: (draft: AppData) => AppData) => void
  addAccount: (
    name: string,
    region: string,
    plan: GamePassPlan,
    openingBalance: number,
    openingStreak: number,
  ) => Account
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => void
  upsertCheckIn: (accountId: string, date: string, balance: number, pieces: number) => void
  deleteCheckIn: (id: string) => void
  addRedemption: (accountId: string, date: string, points: number, usedFor: string) => void
  deleteRedemption: (id: string) => void
  setSettings: (patch: Partial<Settings>) => void
  importData: (data: AppData) => void
  connectSyncFile: () => Promise<void>
  disconnectSyncFile: () => Promise<void>
  syncNow: () => Promise<void>
}

const StoreCtx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [ready, setReady] = useState(false)
  const [syncFileName, setSyncFileName] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const syncHandleRef = useRef<FileSystemFileHandle | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  // ----- carregamento inicial -----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const local = await loadLocalData()
      const handle = await getSyncHandle()
      let next = local
      let fileName: string | null = null
      if (handle) {
        syncHandleRef.current = handle
        fileName = handle.name
        const granted = (await hasWritePermission(handle)) || (await requestWritePermission(handle))
        if (granted) {
          const fileData = await readFromFile(handle)
          if (fileData && (!local || fileData.updatedAt > local.updatedAt)) {
            next = fileData
          }
        }
      }
      if (cancelled) return
      if (next) setData(normalizeData(next))
      setSyncFileName(fileName)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ----- aplicar tema -----
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme
  }, [data.settings.theme])

  // ----- persistência com debounce -----
  const persist = useCallback(async (next: AppData) => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveLocalData(next)
      } catch {
        // IndexedDB indisponível — segue só em memória
      }
      const handle = syncHandleRef.current
      if (handle) {
        try {
          await writeToFile(handle, next)
          setSyncError(null)
        } catch (err) {
          setSyncError(err instanceof Error ? err.message : 'Falha ao sincronizar')
        }
      }
    }, 400)
  }, [])

  const update = useCallback(
    (fn: (draft: AppData) => AppData) => {
      setData((prev) => {
        const next = { ...fn(prev), updatedAt: new Date().toISOString() }
        void persist(next)
        return next
      })
    },
    [persist],
  )

  // ----- contas -----

  const addAccount = useCallback(
    (
      name: string,
      region: string,
      plan: GamePassPlan,
      openingBalance: number,
      openingStreak: number,
    ): Account => {
      const account: Account = {
        id: uid(),
        name,
        region,
        plan,
        openingBalance: Math.max(0, Math.round(openingBalance)),
        openingStreak: Math.max(0, Math.round(openingStreak)),
        color: ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)],
        createdAt: todayISO(),
      }
      update((d) => ({ ...d, accounts: [...d.accounts, account] }))
      return account
    },
    [update],
  )

  const updateAccount = useCallback(
    (id: string, patch: Partial<Account>) => {
      update((d) => ({
        ...d,
        accounts: d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }))
    },
    [update],
  )

  const deleteAccount = useCallback(
    (id: string) => {
      update((d) => ({
        ...d,
        accounts: d.accounts.filter((a) => a.id !== id),
        checkIns: d.checkIns.filter((c) => c.accountId !== id),
        redemptions: d.redemptions.filter((r) => r.accountId !== id),
      }))
    },
    [update],
  )

  // ----- check-in -----

  const upsertCheckIn = useCallback(
    (accountId: string, date: string, balance: number, pieces: number) => {
      update((d) => {
        const existing = d.checkIns.find((c) => c.accountId === accountId && c.date === date)
        if (existing) {
          return {
            ...d,
            checkIns: d.checkIns.map((c) =>
              c.id === existing.id
                ? { ...c, balance: Math.round(balance), pieces: Math.max(0, Math.round(pieces)) }
                : c,
            ),
          }
        }
        const novo: CheckIn = {
          id: uid(),
          accountId,
          date,
          balance: Math.round(balance),
          pieces: Math.max(0, Math.round(pieces)),
          createdAt: new Date().toISOString(),
        }
        return { ...d, checkIns: [...d.checkIns, novo] }
      })
    },
    [update],
  )

  const deleteCheckIn = useCallback(
    (id: string) => {
      update((d) => ({ ...d, checkIns: d.checkIns.filter((c) => c.id !== id) }))
    },
    [update],
  )

  // ----- resgates -----

  const addRedemption = useCallback(
    (accountId: string, date: string, points: number, usedFor: string) => {
      update((d) => {
        const novo: Redemption = {
          id: uid(),
          accountId,
          date,
          points: Math.round(points),
          usedFor: usedFor.trim() || 'Recompensa',
          createdAt: new Date().toISOString(),
        }
        return { ...d, redemptions: [...d.redemptions, novo] }
      })
    },
    [update],
  )

  const deleteRedemption = useCallback(
    (id: string) => {
      update((d) => ({ ...d, redemptions: d.redemptions.filter((r) => r.id !== id) }))
    },
    [update],
  )

  const setSettings = useCallback(
    (patch: Partial<Settings>) => {
      update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    },
    [update],
  )

  const importData = useCallback(
    (incoming: AppData) => {
      const normalized = normalizeData({ ...incoming, updatedAt: new Date().toISOString() })
      setData(normalized)
      void persist(normalized)
    },
    [persist],
  )

  const connectSyncFile = useCallback(async () => {
    try {
      const handle = await pickSyncFile()
      if (!handle) return
      syncHandleRef.current = handle
      setSyncFileName(handle.name)
      setSyncError(null)
      const current = data
      await writeToFile(handle, current)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setSyncError(err instanceof Error ? err.message : 'Falha ao conectar arquivo')
    }
  }, [data])

  const disconnectSyncFile = useCallback(async () => {
    await clearSyncHandle()
    syncHandleRef.current = null
    setSyncFileName(null)
    setSyncError(null)
  }, [])

  const syncNow = useCallback(async () => {
    const handle = syncHandleRef.current
    if (!handle) return
    try {
      await writeToFile(handle, data)
      setSyncError(null)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Falha ao sincronizar')
    }
  }, [data])

  const value: StoreValue = {
    data,
    ready,
    syncFileName,
    syncError,
    update,
    addAccount,
    updateAccount,
    deleteAccount,
    upsertCheckIn,
    deleteCheckIn,
    addRedemption,
    deleteRedemption,
    setSettings,
    importData,
    connectSyncFile,
    disconnectSyncFile,
    syncNow,
  }

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore fora do StoreProvider')
  return ctx
}
