import { useState, useEffect, useCallback } from 'react'
import { offlineQueue } from '../services/offlineQueue'

interface OfflineStatus {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false
  })

  const updateStatus = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      pendingCount: offlineQueue.getQueueCount()
    }))
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, isSyncing: true }))
      offlineQueue.processQueue().finally(() => {
        setStatus(prev => ({ ...prev, isSyncing: false, pendingCount: offlineQueue.getQueueCount() }))
      })
    }

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsubscribe = offlineQueue.subscribe(updateStatus)

    updateStatus()

    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        setStatus(prev => ({ ...prev, pendingCount: offlineQueue.getQueueCount() }))
      }
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
      clearInterval(syncInterval)
    }
  }, [updateStatus])

  return status
}

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOfflineStatus()

  if (isOnline && pendingCount === 0) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium ${
      isOnline ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
    }`}>
      {!isOnline && (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Modo Offline - Sin conexión</span>
        </>
      )}
      {isOnline && pendingCount > 0 && (
        <>
          {isSyncing ? (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Sincronizando {pendingCount} transacción(es)...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>{pendingCount} transacción(es) pendiente(s) de sincronizar</span>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default useOfflineStatus