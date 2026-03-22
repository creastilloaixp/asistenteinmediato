import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Plus, Search, Edit, Trash2, TrendingUp, DollarSign, ShoppingBag, Clock,
  BarChart3, ChevronDown, X, AlertCircle, CheckCircle, Wifi, WifiOff, Sparkles, MessageSquare, Lightbulb,
  CreditCard, Store, ChevronRight, Star, Crown, Zap, Monitor, Activity, AlertTriangle, Thermometer, Printer, Battery,
  FileText, Download, TrendingDown, Eye, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, StoreData, Plan, Product, TopProduct, Transaction, ActivityLog, Customer, CustomerHistory, Tab } from '../types';
import { RealtimeTransaction } from '../hooks/useRealtime';

const API_URL = 'http://localhost:4000/api';

export function MercadoPagoPage({ token }: { token: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const fetchMPRansactions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/transactions?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        const mpTransactions = data.data.transactions.filter((t: Transaction) => 
          t.paymentMethod === 'MERCADOPAGO' || t.paymentMethod === 'MP'
        )
        setTransactions(mpTransactions)
      }
    } catch (err) {
      console.error('Error:', err)
    }
    setLoading(false)
  }

  const checkPaymentStatus = async (paymentId: string) => {
    setCheckingPayment(paymentId)
    try {
      const res = await fetch(`${API_URL}/payments/mercadopago/status/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        alert(`Status: ${data.data.status}\nMonto: $${data.data.amount}\nPayment ID: ${data.data.paymentId}`)
      } else {
        toast.error('Error consultando estado')
      }
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error consultando Mercado Pago')
    }
    setCheckingPayment(null)
  }

  useEffect(() => {
    fetchMPRansactions()
  }, [])

  const formatCurrency = (v: string | number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v))

  const mpPending = transactions.filter(t => t.status === 'PENDING')
  const mpCompleted = transactions.filter(t => t.status === 'COMPLETED')
  const totalPending = mpPending.reduce((sum, t) => sum + parseFloat(t.total), 0)
  const totalCompleted = mpCompleted.reduce((sum, t) => sum + parseFloat(t.total), 0)

  const getDaysRemaining = (createdAt: string) => {
    const created = new Date(createdAt)
    const expires = new Date(created)
    expires.setDate(expires.getDate() + 3) // 3 días de vigencia
    const now = new Date()
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getExpirationBadge = (createdAt: string, status: string) => {
    if (status !== 'PENDING') return null
    const days = getDaysRemaining(createdAt)
    if (days < 0) {
      return { bg: 'bg-red-100', text: 'text-red-700', label: `⚠️ Vencido`, urgent: true }
    } else if (days === 0) {
      return { bg: 'bg-red-100', text: 'text-red-700', label: `⏰ Vence hoy`, urgent: true }
    } else if (days === 1) {
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: `⚡ ${days} día`, urgent: true }
    } else if (days <= 2) {
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `⏳ ${days} días`, urgent: false }
    } else {
      return { bg: 'bg-green-100', text: 'text-green-700', label: `✅ ${days} días`, urgent: false }
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Completado' }
      case 'PENDING': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ Pendiente' }
      case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Fallido' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Mercado Pago</h2>
        <button 
          onClick={fetchMPRansactions}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <span>🔄</span> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-6 text-white">
          <p className="text-blue-100 text-sm">Total Transacciones</p>
          <p className="text-3xl font-bold">{transactions.length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow p-6 text-white">
          <p className="text-yellow-100 text-sm">Pendientes de Confirmar</p>
          <p className="text-3xl font-bold">{mpPending.length}</p>
          <p className="text-yellow-100 text-sm">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-6 text-white">
          <p className="text-green-100 text-sm">Confirmados</p>
          <p className="text-3xl font-bold">{mpCompleted.length}</p>
          <p className="text-green-100 text-sm">{formatCurrency(totalCompleted)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow p-6 text-white">
          <p className="text-purple-100 text-sm">OXXO Voucher</p>
          <p className="text-3xl font-bold">📋</p>
          <p className="text-purple-100 text-sm">Código de barras</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-800">Transacciones Mercado Pago</h3>
          <p className="text-sm text-gray-500">Pagos OXXO y otros métodos de Mercado Pago</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay transacciones de Mercado Pago
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código OXXO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(t => {
                  const status = getStatusBadge(t.status)
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-sm">{t.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{new Date(t.createdAt).toLocaleDateString('es-MX')}</div>
                        <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleTimeString('es-MX')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm bg-blue-50 px-2 py-1 rounded">
                          {t.paymentReference || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.paymentReference ? (
                          <div className="max-w-[200px]">
                            <p className="font-mono text-xs bg-gray-900 text-white p-2 rounded truncate" title={t.paymentReference}>
                              {t.paymentReference}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                          {(() => {
                            const badge = getExpirationBadge(t.createdAt, t.status)
                            if (!badge) return null
                            return (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            )
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(t.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => setSelectedTransaction(t)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {t.paymentReference && (
                            <button 
                              onClick={() => checkPaymentStatus(t.paymentReference!)}
                              disabled={checkingPayment === t.paymentReference}
                              className="text-purple-600 hover:text-purple-800 text-sm disabled:opacity-50"
                              title="Consultar en Mercado Pago"
                            >
                              {checkingPayment === t.paymentReference ? (
                                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Voucher OXXO</h3>
                  <p className="text-sm text-gray-500 font-mono">{selectedTransaction.id}</p>
                </div>
                <button onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 text-center">
                <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-bold text-white">OXXO</span>
                </div>
                <p className="text-3xl font-bold text-green-600 mb-2">{formatCurrency(selectedTransaction.total)}</p>
                <p className="text-gray-600">Pago en cualquier tienda OXXO</p>
              </div>

              <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6">
                <p className="text-center text-sm text-gray-500 mb-4">Código de barras para pagar en OXXO:</p>
                <div className="bg-gray-900 p-4 rounded-xl overflow-auto">
                  <p className="font-mono text-white text-center break-all text-sm leading-relaxed">
                    {selectedTransaction.paymentReference || 'Sin código disponible'}
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTransaction.paymentReference || '')
                      toast.success('Código copiado')
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📋 Copiar código
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                  <p className="font-mono font-bold">{selectedTransaction.paymentReference || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedTransaction.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    selectedTransaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedTransaction.status === 'COMPLETED' ? '✅ Completado' :
                     selectedTransaction.status === 'PENDING' ? '⏳ Pendiente' : '❌ Fallido'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Fecha</p>
                  <p className="font-medium">{new Date(selectedTransaction.createdAt).toLocaleDateString('es-MX')}</p>
                  <p className="text-sm text-gray-500">{new Date(selectedTransaction.createdAt).toLocaleTimeString('es-MX')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Kiosco</p>
                  <p className="font-medium">{(selectedTransaction as any).kiosk?.deviceName || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⏳ Nota:</strong> Las transacciones OXXO pueden tardar hasta 72 horas en confirmarse después del pago en tienda.
                </p>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}