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

import { TransactionDetailModal } from '../components/TransactionDetailModal';
export function TransactionsPage({ transactions }: { transactions: Transaction[] }) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  const formatCurrency = (v: string | number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v))

  const filtered = transactions.filter(t => {
    const matchSearch = t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchMethod = filterMethod === 'all' || t.paymentMethod === filterMethod
    const matchDate = (!dateFrom || new Date(t.createdAt) >= new Date(dateFrom)) &&
                      (!dateTo || new Date(t.createdAt) <= new Date(dateTo + 'T23:59:59'))
    return matchSearch && matchStatus && matchMethod && matchDate
  })

  const totalFiltered = filtered.reduce((sum, t) => sum + parseFloat(t.total), 0)
  const avgFiltered = filtered.length > 0 ? totalFiltered / filtered.length : 0

  const exportToCSV = () => {
    setExportLoading(true)
    const headers = ['Ticket', 'Fecha', 'Hora', 'Método', 'Status', 'Total', 'Productos']
    const rows = filtered.map(t => [
      t.id,
      new Date(t.createdAt).toLocaleDateString('es-MX'),
      new Date(t.createdAt).toLocaleTimeString('es-MX'),
      t.paymentMethod,
      t.status,
      t.total,
      t.items.map(i => `${i.quantity}x ${i.productName}`).join(' | ')
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transacciones_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportLoading(false)
  }

  const getPaymentIcon = (method: string) => {
    switch(method) {
      case 'CASH': return '💵'
      case 'CARD': return '💳'
      case 'QR': return '📲'
      case 'MERCADOPAGO': return '🔵'
      case 'STRIPE': return '💠'
      default: return '💰'
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return { bg: 'bg-green-100', text: 'text-green-700', label: '✅ Completada' }
      case 'PENDING': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ Pendiente' }
      case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-700', label: '❌ Fallida' }
      case 'CANCELLED': return { bg: 'bg-gray-100', text: 'text-gray-700', label: '🚫 Cancelada' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Transacciones</h2>
        <button 
          onClick={exportToCSV}
          disabled={exportLoading || filtered.length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <span>📥</span>
          Exportar CSV ({filtered.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Ticket o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Método</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Todos</option>
              <option value="CASH">💵 Efectivo</option>
              <option value="CARD">💳 Tarjeta</option>
              <option value="QR">📲 QR</option>
              <option value="MERCADOPAGO">🔵 Mercado Pago</option>
              <option value="STRIPE">💠 Stripe</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">Todos</option>
              <option value="COMPLETED">✅ Completadas</option>
              <option value="PENDING">⏳ Pendientes</option>
              <option value="FAILED">❌ Fallidas</option>
              <option value="CANCELLED">🚫 Canceladas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t">
          <div className="flex-1">
            <p className="text-xs text-gray-500">Total Filtrado</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalFiltered)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Ticket Promedio</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(avgFiltered)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Transacciones</p>
            <p className="text-xl font-bold text-purple-600">{filtered.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => {
                const status = getStatusBadge(t.status)
                return (
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTransaction(t)}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-sm">{t.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{new Date(t.createdAt).toLocaleDateString('es-MX')}</div>
                      <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleTimeString('es-MX')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xl">{getPaymentIcon(t.paymentMethod)}</span>
                      <span className="ml-2 text-sm">{t.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {t.items.length > 0 
                        ? t.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')
                        : <span className="text-gray-400 italic">Sin productos</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(t.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Ver</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">No hay transacciones con los filtros seleccionados</p>
        )}
      </div>

      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
        />
      )}
    </div>
  )
}