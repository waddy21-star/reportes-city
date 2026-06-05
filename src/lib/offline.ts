// Cola de reportes pendientes (offline-first).
//
// Si el servidor se cae o se pierde la conexión de red mientras un trabajador
// guarda un reporte desde la tablet, el reporte se almacena localmente en
// IndexedDB y se sincroniza automáticamente cuando el servidor vuelve.
//
// Solo se encolan reportes NUEVOS (creación). La edición requiere conexión.

import type { ReportCreateInput } from '@/types'

const DB_NAME = 'citymall-reportes'
const STORE = 'pendientes'
const DB_VERSION = 1

export interface PendingPhoto {
  dataURL: string
  filename: string
  type: string
}

export interface PendingReport {
  localId: string
  payload: ReportCreateInput // cuerpo del POST a /api/reports
  photos: PendingPhoto[]
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueReport(entry: PendingReport): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getPendingReports(): Promise<PendingReport[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => { db.close(); resolve(req.result as PendingReport[]) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => { db.close(); resolve(req.result) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function removePendingReport(localId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(localId)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

function dataURLtoBlob(dataURL: string): Blob {
  const [head, body] = dataURL.split(',')
  const mime = head.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// Indica si parece que tenemos conexión con el servidor.
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export interface FlushResult {
  synced: number
  remaining: number
  failed: boolean
}

// Intenta enviar todos los reportes pendientes al servidor. Se detiene en
// cuanto uno falla por red (el servidor probablemente sigue caído) y conserva
// los que quedan para reintentar después.
export async function flushQueue(): Promise<FlushResult> {
  const pending = await getPendingReports()
  let synced = 0

  for (const entry of pending) {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      })
      if (!res.ok) {
        // Error del servidor (no de red). Si es un 4xx el reporte nunca
        // se aceptará; lo descartamos para no bloquear la cola.
        if (res.status >= 400 && res.status < 500) {
          await removePendingReport(entry.localId)
          continue
        }
        return { synced, remaining: pending.length - synced, failed: true }
      }

      const report = await res.json()

      // Subir las fotos (si alguna falla por red, el reporte ya quedó creado;
      // continuamos y se reintentarán las fotos en una versión futura — por
      // ahora se omiten las que fallen).
      for (const photo of entry.photos) {
        try {
          const fd = new FormData()
          fd.append('file', dataURLtoBlob(photo.dataURL), photo.filename)
          fd.append('reportId', report.id)
          await fetch('/api/upload', { method: 'POST', body: fd })
        } catch {
          // omitir foto que falla
        }
      }

      await removePendingReport(entry.localId)
      synced++
    } catch {
      // Error de red: el servidor sigue caído. Detener y reintentar luego.
      return { synced, remaining: pending.length - synced, failed: true }
    }
  }

  return { synced, remaining: pending.length - synced, failed: false }
}
