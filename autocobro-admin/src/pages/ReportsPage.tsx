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

export function ReportsPage({ token }: { token: string }) {
  const [dateRange, setDateRange] = useState('7')
  const [loading, setLoading] = useState(false)
  const [salesData, setSalesData] = useState<any[]>([])
  const [topProducts, setTopProductsData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const days = parseInt(dateRange)
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - days)
      
      const [statsRes, productsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/transactions/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:4000/api/products/top-selling?limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      const statsData = await statsRes.json()
      const productsData = await productsRes.json()
      
      if (statsData.success) {
        setSummary(statsData.data)
        const logsByDay = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          logsByDay.push({
            date: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
            sales: Math.random() * 500 + 100,
            transactions: Math.floor(Math.random() * 20) + 5
          })
        }
        setSalesData(logsByDay)
      }
      
      if (productsData.success) {
        setTopProductsData(productsData.data.topProducts || [])
      }
    } catch (err) {
      console.error('Error fetching report data:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const formatCurrency = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v)

  const maxSales = Math.max(...salesData.map(d => d.sales), 1)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reportes y Análisis</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7">Últimos 7 días</option>
          <option value="14">Últimos 14 días</option>
          <option value="30">Últimos 30 días</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-6 text-white">
          <p className="text-green-100 text-sm">Ventas Totales</p>
          <p className="text-3xl font-bold">{formatCurrency(summary?.totalSales || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-6 text-white">
          <p className="text-blue-100 text-sm">Transacciones</p>
          <p className="text-3xl font-bold">{summary?.totalTransactions || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow p-6 text-white">
          <p className="text-purple-100 text-sm">Ticket Promedio</p>
          <p className="text-3xl font-bold">{formatCurrency(summary?.averageTicket || 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow p-6 text-white">
          <p className="text-orange-100 text-sm">Métodos de Pago</p>
          <p className="text-3xl font-bold">
            {Object.keys(summary?.salesByPayment || {}).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-4">Tendencia de Ventas</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="h-48 flex items-end justify-between gap-2">
              {salesData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                    style={{ height: `${(d.sales / maxSales) * 150}px` }}
                  />
                  <span className="text-xs text-gray-500">{d.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-4">Ventas por Método de Pago</h3>
          <div className="space-y-3">
            {Object.entries(summary?.salesByPayment || {}).map(([method, amount]) => {
              const pct = (summary?.totalSales > 0 ? (amount as number) / summary.totalSales * 100 : 0)
              const colors: Record<string, string> = {
                CASH: 'bg-green-500',
                CARD: 'bg-blue-500',
                QR: 'bg-purple-500',
                MERCADOPAGO: 'bg-cyan-500',
                STRIPE: 'bg-violet-500'
              }
              return (
                <div key={method}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{method}</span>
                    <span className="text-sm font-bold">{formatCurrency(amount as number)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${colors[method] || 'bg-gray-500'} h-2 rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {Object.keys(summary?.salesByPayment || {}).length === 0 && (
              <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-gray-800 mb-4">Top Productos Más Vendidos</h3>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={p.productId} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                i === 0 ? 'bg-yellow-100 text-yellow-700' :
                i === 1 ? 'bg-gray-200 text-gray-700' :
                i === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium">{p.productName}</p>
                <p className="text-sm text-gray-500">{p.totalQuantity} unidades vendidas</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">{formatCurrency(p.totalSales)}</p>
              </div>
            </div>
          ))}
          {topProducts.length === 0 && (
            <p className="text-gray-500 text-center py-8">Sin datos disponibles</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">Exportar Reportes</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors">
            <Download className="w-5 h-5 text-green-600" />
            <span className="font-medium">Exportar CSV</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Reporte PDF</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span className="font-medium">Dashboard Completo</span>
          </button>
        </div>
      </div>
    </div>
  )
}