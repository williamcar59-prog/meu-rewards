// Store global: estado + ações + persistência (IndexedDB + sync de arquivo)

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  ACCOUNT_COLORS,
  Account,
  AppData,
  Entry,
  Settings,
  Task,
  defaultTasks,
  emptyData,
  uid,
} from './types'
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
  addAccount: (name: string, region: string, currency: 'BRL' | 'USD') => Account
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => void
  addEntry: (entry: Omit<Entry, 'id' | 'createdAt'>) => void
  deleteEntry: (id: string) => void
  toggleTask: (accountId: string, task: Task, date: string) => void
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
          // usa o arquivo se for mais recente que o local
          if (fileData && (!local || fileData.updatedAt > local.updatedAt)) {
            next = { ...fileData, settings: { ...emptyData().settings, ...fileData.settings } }
          }
        }
      }
      if (cancelled) return
      if (next) {
        setData({ ...emptyData(), ...next, settings: { ...emptyData().settings, ...next.settings } })
      }
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

  // ----- ações -----

  const addAccount = useCallback(
    (name: string, region: string, currency: 'BRL' | 'USD'): Account => {
      const account: Account = {
        id: uid(),
        name,
        region,
        currency,
        color: ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)],
        goal: null,
        tasks: defaultTasks(),
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
        entries: d.entries.filter((e) => e.accountId !== id),
      }))
    },
    [update],
  )

  const addEntry = useCallback(
    (entry: Omit<Entry, 'id' | 'createdAt'>) => {
      update((d) => ({
        ...d,
        entries: [...d.entries, { ...entry, id: uid(), createdAt: new Date().toISOString() }],
      }))
    },
    [update],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }))
    },
    [update],
  )

  const toggleTask = useCallback(
    (accountId: string, task: Task, date: string) => {
      update((d) => {
        const existing = d.entries.find(
          (e) =>
            e.accountId === accountId &&
            e.taskId === task.id &&
            e.date === date &&
            e.source === 'checklist',
        )
        if (existing) {
          return { ...d, entries: d.entries.filter((e) => e.id !== existing.id) }
        }
        return {
          ...d,
          entries: [
            ...d.entries,
            {
              id: uid(),
              accountId,
              type: 'earn' as const,
              points: task.points,
              label: task.name,
              date,
              createdAt: new Date().toISOString(),
              source: 'checklist' as const,
              taskId: task.id,
            },
          ],
        }
      })
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
      setData({ ...emptyData(), ...incoming, updatedAt: new Date().toISOString() })
      void persist({ ...emptyData(), ...incoming, updatedAt: new Date().toISOString() })
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
      // grava o estado atual no arquivo escolhido
      const current = data
      await writeToFile(handle, current)
    } catch (err) {
      // usuário cancelou o diálogo ou navegador sem suporte
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
    addEntry,
    deleteEntry,
    toggleTask,
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
