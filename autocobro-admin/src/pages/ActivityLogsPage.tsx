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
import { API_URL } from '../config';


export function ActivityLogsPage({ logs, stats }: { logs: ActivityLog[]; stats: any }) {
  const [filterType, setFilterType] = useState('all')
  const [filterDays, setFilterDays] = useState('7')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  const activityTypes = [
    { id: 'all', label: 'Todos' },
    { id: 'USER_LOGIN', label: '🔐 Inicios de sesión' },
    { id: 'PRODUCT', label: '📦 Productos' },
    { id: 'TRANSACTION', label: '🛒 Transacciones' },
    { id: 'KIOSK', label: '🖥️ Kioscos' },
    { id: 'PAYMENT', label: '💰 Pagos' },
  ]

  const filteredLogs = logs.filter(log => {
    if (filterType === 'all') return true
    if (filterType === 'PRODUCT') return log.type.includes('PRODUCT')
    if (filterType === 'TRANSACTION') return log.type.includes('TRANSACTION')
    if (filterType === 'KIOSK') return log.type.includes('KIOSK')
    if (filterType === 'PAYMENT') return log.type.includes('PAYMENT')
    return log.type === filterType
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Registro de Actividad</h2>
        <div className="flex gap-4">
          <select
            value={filterDays}
            onChange={(e) => setFilterDays(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="1">Últimas 24 horas</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
          </select>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Total Actividades</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalActivities || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Transacciones</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.logsByType?.find((t: any) => t.type === 'TRANSACTION_COMPLETED')?._count?.type || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Pagos Recibidos</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.logsByType?.find((t: any) => t.type === 'PAYMENT_RECEIVED')?._count?.type || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Alertas Kioscos</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.logsByType?.find((t: any) => t.type === 'KIOSK_ALERT')?._count?.type || 0}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex gap-2 flex-wrap">
          {activityTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterType === type.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="divide-y max-h-[500px] overflow-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay actividades registradas
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4"
                onClick={() => setSelectedLog(log)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${log.colorClass}`}>
                  {log.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{log.action}</p>
                      {log.userName && (
                        <p className="text-sm text-gray-500">por {log.userName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString('es-MX')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString('es-MX')}
                      </p>
                    </div>
                  </div>
                  {log.details && (
                    <p className="text-sm text-gray-400 mt-1 truncate">
                      {JSON.stringify(log.details).slice(0, 100)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Detalle de Actividad</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${selectedLog.colorClass}`}>
                  {selectedLog.icon}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedLog.action}</p>
                  <p className="text-sm text-gray-500">{selectedLog.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Fecha</p>
                  <p className="font-medium">{new Date(selectedLog.createdAt).toLocaleString('es-MX')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Usuario</p>
                  <p className="font-medium">{selectedLog.userName || 'Sistema'}</p>
                </div>
                {selectedLog.entityType && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Entidad</p>
                      <p className="font-medium">{selectedLog.entityType}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">ID</p>
                      <p className="font-mono text-sm">{selectedLog.entityId?.slice(0, 8)}...</p>
                    </div>
                  </>
                )}
              </div>
              {selectedLog.details && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-medium mb-2">Detalles adicionales</p>
                  <pre className="text-sm text-blue-800 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}