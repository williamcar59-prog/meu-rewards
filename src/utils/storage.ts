// Persistência: IndexedDB local + sincronização opcional com arquivo .json (File System Access API)

import { AppData, emptyData } from '../types'

const DB_NAME = 'rewards-tracker'
const STORE = 'kv'
const KEY_DATA = 'appdata'
const KEY_HANDLE = 'sync-handle'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as T) ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadLocalData(): Promise<AppData | null> {
  try {
    return await idbGet<AppData>(KEY_DATA)
  } catch {
    return null
  }
}

export async function saveLocalData(data: AppData): Promise<void> {
  await idbSet(KEY_DATA, data)
}

export function fsApiSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

export async function pickSyncFile(): Promise<FileSystemFileHandle | null> {
  if (!fsApiSupported()) return null
  const handle = await (window as unknown as {
    showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>
  }).showSaveFilePicker({
    suggestedName: 'rewards-data.json',
    types: [
      {
        description: 'Dados do Meu Rewards',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })
  await idbSet(KEY_HANDLE, handle)
  return handle
}

export async function getSyncHandle(): Promise<FileSystemFileHandle | null> {
  try {
    return await idbGet<FileSystemFileHandle>(KEY_HANDLE)
  } catch {
    return null
  }
}

export async function clearSyncHandle(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY_HANDLE)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function hasWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const h = handle as unknown as {
    queryPermission: (d: unknown) => Promise<PermissionState>
  }
  const state = await h.queryPermission({ mode: 'readwrite' })
  return state === 'granted'
}

export async function requestWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const h = handle as unknown as {
    requestPermission: (d: unknown) => Promise<PermissionState>
  }
  const state = await h.requestPermission({ mode: 'readwrite' })
  return state === 'granted'
}

export async function writeToFile(handle: FileSystemFileHandle, data: AppData): Promise<void> {
  const writable = await (handle as unknown as {
    createWritable: () => Promise<WritableStream>
  }).createWritable()
  const writer = (writable as unknown as { write: (d: string) => Promise<void>; close: () => Promise<void> })
  await writer.write(JSON.stringify(data, null, 2))
  await writer.close()
}

export async function readFromFile(handle: FileSystemFileHandle): Promise<AppData | null> {
  try {
    const file = await (handle as unknown as { getFile: () => Promise<File> }).getFile()
    const text = await file.text()
    const parsed = JSON.parse(text) as AppData
    if (!parsed || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.entries)) return null
    return parsed
  } catch {
    return null
  }
}

export function newEmptyData(): AppData {
  return emptyData()
}
