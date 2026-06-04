'use client'

import { useEffect, useRef, useState } from 'react'
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { flushQueue, getPendingCount } from '@/lib/offline'

// Monta un motor de sincronización en segundo plano. Reintenta enviar los
// reportes guardados localmente cuando el servidor vuelve a estar disponible
// (al cargar, al recuperar conexión y cada cierto intervalo). Muestra un
// indicador flotante con la cantidad pendiente.

const POLL_MS = 20000

export default function OfflineSync() {
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(0)
  const busyRef = useRef(false)

  const refreshCount = async () => {
    try { setPending(await getPendingCount()) } catch {}
  }

  const trySync = async () => {
    if (busyRef.current) return
    const count = await getPendingCount().catch(() => 0)
    if (count === 0) { setPending(0); return }

    busyRef.current = true
    setSyncing(true)
    try {
      const result = await flushQueue()
      if (result.synced > 0) {
        setJustSynced(result.synced)
        setTimeout(() => setJustSynced(0), 4000)
      }
      setPending(result.remaining)
    } catch {
      await refreshCount()
    } finally {
      setSyncing(false)
      busyRef.current = false
    }
  }

  useEffect(() => {
    refreshCount()
    trySync()

    const onOnline = () => trySync()
    const onPending = () => { refreshCount(); trySync() }
    window.addEventListener('online', onOnline)
    window.addEventListener('citymall:pending-changed', onPending)

    const interval = setInterval(trySync, POLL_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('citymall:pending-changed', onPending)
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (pending === 0 && justSynced === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {pending > 0 ? (
        <button
          onClick={trySync}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all"
          style={{ backgroundColor: '#D64440' }}
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CloudOff className="w-4 h-4" />
          )}
          <span>
            {syncing
              ? 'Sincronizando...'
              : `${pending} reporte${pending !== 1 ? 's' : ''} sin sincronizar`}
          </span>
        </button>
      ) : (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#22C55E' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{justSynced} reporte{justSynced !== 1 ? 's' : ''} sincronizado{justSynced !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}
