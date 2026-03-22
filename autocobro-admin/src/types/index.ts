export interface User {
  id: string
  email: string
  name: string
  role: string
  store?: { id: string; name: string }
}

export interface StoreData {
  id: string
  name: string
  apiKey?: string
  plan: string
  maxKiosks: number
  maxProducts: number
  subscription?: {
    status: string
    currentPeriodEnd: string
  }
  _count?: {
    kiosks: number
    products: number
    users: number
  }
}

export interface Plan {
  id: string
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
    currency: string
  }
  limits: {
    kiosks: number | string
    products: number | string
    transactions: number | string
  }
  features: {
    name: string
    included: boolean
  }[]
  highlighted?: boolean
}

export interface Product {
  id: string
  name: string
  barcode?: string
  price: string
  stock: number
  category?: string
  active: boolean
}

export interface TopProduct {
  productId: string
  productName: string
  totalQuantity: number
  totalSales: number
}

export interface Transaction {
  id: string
  total: number | string
  paymentMethod: string
  status: string
  createdAt: string
  completedAt?: string
  cashReceived?: number
  change?: number
  paymentReference?: string
  items: { productName: string; quantity: number; unitPrice: number | string }[]
}

export interface ActivityLog {
  id: string
  type: string
  action: string
  userName?: string
  userId?: string
  entityType?: string
  entityId?: string
  details?: any
  colorClass?: string
  icon?: any
  createdAt: string
}

export interface Customer {
  id: string
  email?: string
  phone?: string
  name?: string
  loyaltyPoints: number
  totalSpent: number | string
  visitCount: number
  lastVisit?: string
  createdAt: string
}

export interface CustomerHistory {
  transactions: Transaction[]
  stats: {
    totalSpent: number
    transactionCount: number
    averageTicket: number
  }
}

export type Tab = 'dashboard' | 'products' | 'transactions' | 'settings' | 'pricing' | 'stores' | 'devices' | 'logs' | 'reports' | 'mercadopago' | 'customers'
export * from './KioskHealthData';
