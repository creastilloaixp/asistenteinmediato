import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Plus, Search, Edit, Trash2, TrendingUp, DollarSign, ShoppingBag, Clock,
  BarChart3, ChevronDown, X, AlertCircle, CheckCircle, Wifi, WifiOff, Sparkles, MessageSquare, Lightbulb,
  CreditCard, Store, ChevronRight, Star, Crown, Zap, Monitor, Activity, AlertTriangle, Thermometer, Printer, Battery,
  FileText, Download, TrendingDown, Eye, RefreshCw
} from 'lucide-react'
import { useRealtime, RealtimeTransaction } from './hooks/useRealtime'
import { AiInsightsWidget } from './components/AiInsightsWidget'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { User, StoreData, Plan, Product, TopProduct, Transaction, ActivityLog, Customer, CustomerHistory, Tab } from './types'
import { PlanBadge } from './components/PlanBadge'
import { LoginPage } from './pages/LoginPage'
import { Dashboard } from './pages/Dashboard'
import { LiveIndicator } from './components/LiveIndicator'
import { ProductsPage } from './pages/ProductsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { TransactionDetailModal } from './components/TransactionDetailModal'
import { StoresPage } from './pages/StoresPage'
import { PricingPage } from './pages/PricingPage'
import { StoreSelector } from './components/StoreSelector'
import { SettingsPage } from './pages/SettingsPage'
import { ProductModal } from './components/ProductModal'
import { DevicesPage } from './pages/DevicesPage'
import { ActivityLogsPage } from './pages/ActivityLogsPage'
import { MercadoPagoPage } from './pages/MercadoPagoPage'
import { ReportsPage } from './pages/ReportsPage'
import { API_URL } from './config';


function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [currentStore, setCurrentStore] = useState<StoreData | null>(null)
  const [userStores, setUserStores] = useState<StoreData[]>([])
  const [showStoreSelector, setShowStoreSelector] = useState(false)
  
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [stats, setStats] = useState({ totalSales: 0, totalTransactions: 0, averageTicket: 0, salesByPayment: {} as Record<string, number> })
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [logsStats, setLogsStats] = useState<any>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [customerForm, setCustomerForm] = useState({ email: '', phone: '', name: '', notes: '' })
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerView, setCustomerView] = useState<'list' | 'detail'>('list')

  const handleNewTransaction = (transaction: RealtimeTransaction) => {
    const formattedTransaction: Transaction = {
      id: transaction.id,
      total: transaction.total,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      createdAt: transaction.createdAt,
      items: transaction.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    setLiveTransactions(prev => [formattedTransaction, ...prev.slice(0, 9)]);
    setStats(prev => ({
      ...prev,
      totalSales: prev.totalSales + parseFloat(transaction.total),
      totalTransactions: prev.totalTransactions + 1,
      averageTicket: (prev.totalSales + parseFloat(transaction.total)) / (prev.totalTransactions + 1),
    }));
    fetchTopProducts();
  };

  const { isConnected, reconnect } = useRealtime({
    storeId: user?.store?.id || '',
    token: token || '',
    onNewTransaction: handleNewTransaction,
  });
  
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({ name: '', barcode: '', price: '', stock: '', category: '' })

  useEffect(() => {
    if (token) {
      fetchUser()
      fetchMyStores()
    } else {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token && currentStore) {
      fetchStats()
    }
  }, [token, currentStore?.id])

  useEffect(() => {
    if (token && activeTab === 'products') fetchProducts()
    if (token && activeTab === 'transactions') fetchTransactions()
    if (token && activeTab === 'dashboard') {
      fetchStats()
      fetchTopProducts()
    }
    if (token && activeTab === 'logs') {
      fetchActivityLogs()
      fetchLogsStats()
    }
    if (token && activeTab === 'customers') {
      fetchCustomers()
    }
  }, [token, activeTab])

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/activity-logs?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setActivityLogs(data.data.logs)
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err)
    }
  }

  const fetchLogsStats = async () => {
    try {
      const res = await fetch(`${API_URL}/activity-logs/stats?days=7`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setLogsStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch logs stats:', err)
    }
  }

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.data.user)
      } else {
        handleLogout()
      }
    } catch {
      handleLogout()
    } finally {
      setLoading(false)
    }
  }

  const fetchMyStores = async () => {
    try {
      const res = await fetch(`${API_URL}/stores/my-stores`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.data.stores.length > 0) {
        setUserStores(data.data.stores)
        const activeStore = data.data.stores.find((s: StoreData) => s.id === data.data.activeStoreId) || data.data.stores[0]
        setCurrentStore(activeStore)
      }
    } catch (err) {
      console.error('Failed to fetch stores:', err)
    }
  }

  const handleSwitchStore = async (storeId: string) => {
    try {
      const res = await fetch(`${API_URL}/stores/switch-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ storeId })
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.data.user)
        setCurrentStore(data.data.store)
        setShowStoreSelector(false)
        setActiveTab('dashboard')
      }
    } catch (err) {
      console.error('Failed to switch store:', err)
    }
  }

  const handleRegisterStore = async (name: string, email: string, password: string, storeName: string) => {
    try {
      const res = await fetch(`${API_URL}/stores/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, storeName })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('token', data.data.token)
        setToken(data.data.token)
        setUser(data.data.user)
        setCurrentStore({
          id: data.data.store.id,
          name: data.data.store.name,
          plan: data.data.store.plan,
          maxKiosks: 1,
          maxProducts: 50,
          apiKey: data.data.store.apiKey
        })
        setShowStoreSelector(false)
        return true
      } else {
        alert(data.error?.message || 'Registration failed')
        return false
      }
    } catch (err) {
      alert('Registration failed')
      return false
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setProducts(data.data.products)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data.transactions)
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products/top-selling?limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setTopProducts(data.data.topProducts)
      }
    } catch (err) {
      console.error('Failed to fetch top products:', err)
    }
  }

  const fetchCustomers = async (search?: string) => {
    try {
      const url = search 
        ? `${API_URL}/customers?search=${encodeURIComponent(search)}`
        : `${API_URL}/customers`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setCustomers(data.data.customers)
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }

  const fetchCustomerHistory = async (customerId: string) => {
    try {
      const res = await fetch(`${API_URL}/customers/${customerId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setCustomerHistory(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch customer history:', err)
    }
  }

  const handleSaveCustomer = async () => {
    try {
      const method = selectedCustomer ? 'PUT' : 'POST'
      const url = selectedCustomer 
        ? `${API_URL}/customers/${selectedCustomer.id}`
        : `${API_URL}/customers`
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(customerForm)
      })
      const data = await res.json()
      if (data.success) {
        fetchCustomers()
        setShowCustomerModal(false)
        setSelectedCustomer(null)
        setCustomerForm({ email: '', phone: '', name: '', notes: '' })
      } else {
        alert(data.error?.message || 'Error saving customer')
      }
    } catch (err) {
      alert('Error saving customer')
    }
  }

  const handleAddPoints = async (customerId: string, points: number, action: 'add' | 'subtract') => {
    try {
      const res = await fetch(`${API_URL}/customers/${customerId}/points`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ points, action })
      })
      const data = await res.json()
      if (data.success) {
        fetchCustomers()
        if (selectedCustomer?.id === customerId) {
          setSelectedCustomer(data.data.customer)
        }
      }
    } catch (err) {
      console.error('Failed to update points:', err)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('token', data.data.token)
        setToken(data.data.token)
        setUser(data.data.user)
      } else {
        toast.error(data.error?.message || 'Error en login')
      }
    } catch (err) {
      toast.error('Error en login')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const handleSaveProduct = async () => {
    try {
      const method = editingProduct ? 'PUT' : 'POST'
      const url = editingProduct 
        ? `${API_URL}/products/${editingProduct.id}` 
        : `${API_URL}/products`
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: productForm.name,
          barcode: productForm.barcode || null,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock) || 0,
          category: productForm.category || null
        })
      })
      
      const data = await res.json()
      if (data.success) {
        setShowProductModal(false)
        setEditingProduct(null)
        setProductForm({ name: '', barcode: '', price: '', stock: '', category: '' })
        fetchProducts()
      } else {
        alert(data.error?.message || 'Error saving product')
      }
    } catch (err) {
      toast.error('Error guardando producto')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        fetchProducts()
      }
    } catch (err) {
      toast.error('Error eliminando producto')
    }
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      barcode: product.barcode || '',
      price: product.price,
      stock: product.stock.toString(),
      category: product.category || ''
    })
    setShowProductModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-MX')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-blue-600">AutoCobro</h1>
              {userStores.length > 1 && (
                <button 
                  onClick={() => setShowStoreSelector(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Store className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 font-medium">{currentStore?.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
              )}
              {currentStore && (
                <PlanBadge plan={currentStore.plan} />
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user?.name}</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow p-4 space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'transactions', label: 'Ventas', icon: ShoppingCart },
                { id: 'mercadopago', label: 'Mercado Pago', icon: CreditCard },
                { id: 'reports', label: 'Reportes', icon: BarChart3 },
                { id: 'products', label: 'Productos', icon: Package },
                { id: 'logs', label: 'Actividad', icon: Activity },
                { id: 'devices', label: 'Dispositivos', icon: Monitor },
                { id: 'customers', label: 'Clientes', icon: Users },
                { id: 'stores', label: 'Tiendas', icon: Store },
                { id: 'pricing', label: 'Planes', icon: CreditCard },
                { id: 'settings', label: 'Configuración', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {activeTab === 'dashboard' && currentStore && (
                  <Dashboard 
                    stats={stats} 
                    transactions={transactions} 
                    liveTransactions={liveTransactions}
                    topProducts={topProducts}
                    onNavigate={setActiveTab}
                    isConnected={isConnected}
                    onReconnect={reconnect}
                    store={currentStore}
                    token={token || ''}
                  />
                )}
                {activeTab === 'products' && (
                  <ProductsPage 
                    products={products} 
                    onAdd={() => {
                      setEditingProduct(null)
                      setProductForm({ name: '', price: '', stock: '0', barcode: '', category: '' })
                      setShowProductModal(true)
                    }} 
                    onEdit={(p) => {
                      setEditingProduct(p)
                      setProductForm({ name: p.name, price: p.price, stock: p.stock.toString(), barcode: p.barcode || '', category: p.category || '' })
                      setShowProductModal(true)
                    }} 
                    onDelete={handleDeleteProduct} 
                  />
                )}
                {activeTab === 'transactions' && <TransactionsPage transactions={transactions} />}
                {activeTab === 'settings' && <SettingsPage user={user} store={currentStore!} />}
                {activeTab === 'pricing' && <PricingPage currentPlan={currentStore?.plan || 'FREE'} onSelectPlan={() => {}} />}
                {activeTab === 'stores' && <StoresPage stores={userStores} onSwitch={(id) => {
                    const store = userStores.find(s => s.id === id)
                    if (store) {
                      setCurrentStore(store)
                      setActiveTab('dashboard')
                    }
                  }} onAddNew={() => {}} />}
                {activeTab === 'devices' && <DevicesPage storeId={currentStore?.id || null} token={token} />}
                {activeTab === 'logs' && <ActivityLogsPage logs={activityLogs} stats={logsStats} />}
                {activeTab === 'mercadopago' && <MercadoPagoPage token={token!} />}
                {activeTab === 'reports' && <ReportsPage token={token!} />}
                {activeTab === 'customers' && (
                  <div className="bg-white rounded-xl shadow">
                    <div className="p-6 border-b">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Clientes Frecuentes</h2>
                        <button
                          onClick={() => {
                            setCustomerForm({ name: '', email: '', phone: '', notes: '' })
                            setShowCustomerModal(true)
                          }}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          Nuevo Cliente
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      {customerView === 'list' ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Cliente</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Contacto</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Puntos</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Total Gastado</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Visitas</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Última Visita</th>
                                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {customers.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{c.name || 'Sin nombre'}</div>
                                    <div className="text-xs text-gray-500">ID: {c.id.slice(0,8)}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm">{c.email || '-'}</div>
                                    <div className="text-xs text-gray-500">{c.phone || '-'}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                                      <Star className="w-3 h-3" />
                                      {c.loyaltyPoints}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-green-600">
                                    ${Number(c.totalSpent).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">{c.visitCount}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setCustomerForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', notes: '' })
                                          setShowCustomerModal(true)
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      >
                                        <Edit className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {customers.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    No hay clientes registrados
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : selectedCustomer && customerHistory && (
                        <div>
                          <button
                            onClick={() => {
                              setCustomerView('list')
                              setSelectedCustomer(null)
                              setCustomerHistory(null)
                            }}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                            Volver a lista
                          </button>
                          
                          <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="text-sm text-gray-500">Total Gastado</div>
                              <div className="text-2xl font-bold text-blue-600">${customerHistory.stats.totalSpent.toFixed(2)}</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <div className="text-sm text-gray-500">Transacciones</div>
                              <div className="text-2xl font-bold text-green-600">{customerHistory.stats.transactionCount}</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="text-sm text-gray-500">Ticket Promedio</div>
                              <div className="text-2xl font-bold text-purple-600">${customerHistory.stats.averageTicket.toFixed(2)}</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4">
                              <div className="text-sm text-gray-500">Puntos Lealtad</div>
                              <div className="text-2xl font-bold text-yellow-600">⭐ {selectedCustomer.loyaltyPoints}</div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleAddPoints(selectedCustomer.id, 10, 'add')}
                                  className="text-xs bg-yellow-200 px-2 py-1 rounded hover:bg-yellow-300"
                                >
                                  +10
                                </button>
                                <button
                                  onClick={() => handleAddPoints(selectedCustomer.id, 10, 'subtract')}
                                  className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                                >
                                  -10
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-lg mb-4">Historial de Compras</h3>
                          <div className="space-y-3">
                            {customerHistory.transactions.map((tx) => (
                              <div key={tx.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-medium">#{tx.id.slice(0, 8)}</span>
                                    <span className="ml-2 text-sm text-gray-500">
                                      {new Date(tx.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <span className="font-bold text-green-600">${Number(tx.total).toFixed(2)}</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {tx.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                                </div>
                              </div>
                            ))}
                            {customerHistory.transactions.length === 0 && (
                              <p className="text-gray-500 text-center py-4">No hay transacciones</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          form={productForm}
          setForm={setProductForm}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowProductModal(false)
            setEditingProduct(null)
          }}
        />
      )}

      {showStoreSelector && (
        <StoreSelector
          stores={userStores}
          currentStoreId={currentStore?.id}
          onSelect={handleSwitchStore}
          onClose={() => setShowStoreSelector(false)}
          onAddNew={() => {
            setShowStoreSelector(false)
            setActiveTab('pricing')
          }}
        />
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
                {selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => {
                setShowCustomerModal(false)
                setSelectedCustomer(null)
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del cliente"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="email@ejemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5512345678"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCustomerModal(false)
                    setSelectedCustomer(null)
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCustomer}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App