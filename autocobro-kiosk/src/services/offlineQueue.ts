export interface PendingTransaction {
  id: string
  items: { productId: string; quantity: number }[]
  paymentMethod: 'CASH' | 'CARD' | 'QR'
  cashReceived?: number
  changeGiven?: number
  total: number
  createdAt: string
  status: 'pending' | 'syncing' | 'failed'
  retryCount: number
}

const STORAGE_KEY = 'kiosk_pending_transactions'
const MAX_RETRIES = 3
const SYNC_INTERVAL = 30000

class OfflineQueue {
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.startSyncTimer()
    window.addEventListener('online', () => this.processQueue())
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getPendingTransactions(): PendingTransaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  private saveTransactions(transactions: PendingTransaction[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    this.notifyListeners()
  }

  addTransaction(transaction: Omit<PendingTransaction, 'id' | 'createdAt' | 'status' | 'retryCount'>): string {
    const transactions = this.getPendingTransactions()
    const newTransaction: PendingTransaction = {
      ...transaction,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0
    }
    transactions.push(newTransaction)
    this.saveTransactions(transactions)
    return newTransaction.id
  }

  updateTransactionStatus(id: string, status: PendingTransaction['status']) {
    const transactions = this.getPendingTransactions()
    const index = transactions.findIndex(t => t.id === id)
    if (index !== -1) {
      transactions[index].status = status
      this.saveTransactions(transactions)
    }
  }

  incrementRetryCount(id: string) {
    const transactions = this.getPendingTransactions()
    const index = transactions.findIndex(t => t.id === id)
    if (index !== -1) {
      transactions[index].retryCount += 1
      if (transactions[index].retryCount >= MAX_RETRIES) {
        transactions[index].status = 'failed'
      }
      this.saveTransactions(transactions)
    }
  }

  removeTransaction(id: string) {
    const transactions = this.getPendingTransactions()
    const filtered = transactions.filter(t => t.id !== id)
    this.saveTransactions(filtered)
  }

  getQueueCount(): number {
    return this.getPendingTransactions().filter(t => t.status === 'pending').length
  }

  private startSyncTimer() {
    if (this.syncTimer) return
    this.syncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.processQueue()
      }
    }, SYNC_INTERVAL)
  }

  async processQueue() {
    if (!navigator.onLine) return

    const transactions = this.getPendingTransactions()
    const pending = transactions.filter(t => t.status === 'pending' && t.retryCount < MAX_RETRIES)

    for (const transaction of pending) {
      await this.syncTransaction(transaction)
    }
  }

  private async syncTransaction(transaction: PendingTransaction) {
    const deviceKey = import.meta.env.VITE_KIOSK_KEY
    if (!deviceKey) return

    this.updateTransactionStatus(transaction.id, 'syncing')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/kiosk/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Key': deviceKey
        },
        body: JSON.stringify({
          items: transaction.items,
          paymentMethod: transaction.paymentMethod,
          offlineId: transaction.id
        })
      })

      if (!response.ok) throw new Error('Failed to sync')

      const data = await response.json()
      const transactionId = data.data.transaction.id

      if (transaction.paymentMethod === 'CASH' && transaction.cashReceived) {
        await fetch(`${import.meta.env.VITE_API_URL}/kiosk/transactions/${transactionId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Key': deviceKey
          },
          body: JSON.stringify({
            cashReceived: transaction.cashReceived,
            changeGiven: transaction.changeGiven
          })
        })
      }

      this.removeTransaction(transaction.id)
    } catch (error) {
      console.error('Failed to sync transaction:', transaction.id, error)
      this.incrementRetryCount(transaction.id)
    }
  }

  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }
}

export const offlineQueue = new OfflineQueue()
export default offlineQueue