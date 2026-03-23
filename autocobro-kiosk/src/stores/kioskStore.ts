import { create } from 'zustand'

export interface Product {
  id: string
  barcode?: string
  name: string
  price: number
  image?: string
  stock: number
  category?: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Transaction {
  id: string
  items: { productName: string; quantity: number; unitPrice: number }[]
  total: number
  paymentMethod: 'CASH' | 'CARD' | 'QR' | 'MERCADOPAGO' | 'STRIPE'
  change?: number
  cashReceived?: number
  paymentReference?: string
  completedAt?: string
  pendingAt?: string
}

interface KioskState {
  deviceKey: string
  kioskId: string | null
  storeName: string | null
  storeId: string | null
  products: Product[]
  cart: CartItem[]
  currentTransaction: Transaction | null
  currentScreen: 'home' | 'search' | 'cart' | 'payment' | 'receipt'
  isInitialized: boolean
  lastSync: Date | null
  customer: { id: string, name: string, phone: string, loyaltyPoints: number, isNew: boolean } | null

  setDeviceKey: (key: string) => void
  setKioskInfo: (info: { kioskId: string; storeName: string; storeId: string }) => void
  setProducts: (products: Product[]) => void
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setScreen: (screen: KioskState['currentScreen']) => void
  setTransaction: (transaction: Transaction | null) => void
  setCustomer: (customer: KioskState['customer']) => void
  setInitialized: (value: boolean) => void
  setLastSync: (date: Date) => void
  initialize: () => Promise<void>
  syncProducts: () => Promise<void>
}

export const useKioskStore = create<KioskState>((set, get) => ({
  deviceKey: import.meta.env.VITE_KIOSK_KEY || '',
  kioskId: null,
  storeName: null,
  storeId: null,
  products: [],
  cart: [],
  currentTransaction: null,
  currentScreen: 'home',
  isInitialized: false,
  lastSync: null,
  customer: null,

  setCustomer: (customer) => set({ customer }),

  setDeviceKey: (key) => set({ deviceKey: key }),

  setKioskInfo: (info) => set({
    kioskId: info.kioskId,
    storeName: info.storeName,
    storeId: info.storeId
  }),

  setProducts: (products) => set({ products }),

  addToCart: (product) => {
    const { cart } = get()
    const existing = cart.find(item => item.product.id === product.id)
    
    if (existing) {
      set({
        cart: cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      })
    } else {
      set({ cart: [...cart, { product, quantity: 1 }] })
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(item => item.product.id !== productId) })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId)
      return
    }
    set({
      cart: get().cart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    })
  },

  clearCart: () => set({ cart: [], currentTransaction: null, customer: null }),

  setScreen: (screen) => set({ currentScreen: screen }),

  setTransaction: (transaction) => set({ currentTransaction: transaction }),

  setInitialized: (value) => set({ isInitialized: value }),

  setLastSync: (date) => set({ lastSync: date }),

  initialize: async () => {
    const { deviceKey } = get()
    
    if (!deviceKey) {
      console.warn('No device key configured')
      set({ isInitialized: false })
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/kiosks/${deviceKey}/sync`)
      
      if (!response.ok) {
        throw new Error('Failed to sync')
      }

      const data = await response.json()
      
      set({
        kioskId: data.data.kioskId,
        storeName: data.data.storeName,
        storeId: data.data.storeId,
        products: data.data.products,
        isInitialized: true,
        lastSync: new Date()
      })
    } catch (error) {
      console.error('Failed to initialize kiosk:', error)
      set({ isInitialized: false })
    }
  },

  syncProducts: async () => {
    const { deviceKey, setProducts, setLastSync } = get()
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/kiosks/${deviceKey}/sync`)
      const data = await response.json()
      
      setProducts(data.data.products)
      setLastSync(new Date())
    } catch (error) {
      console.error('Failed to sync products:', error)
    }
  },
}))
