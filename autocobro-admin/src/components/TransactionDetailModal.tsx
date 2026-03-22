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


export function TransactionDetailModal({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const formatCurrency = (v: string | number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v))

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'COMPLETED': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada' }
      case 'PENDING': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' }
      case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Fallida' }
      case 'CANCELLED': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelada' }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
    }
  }

  const status = getStatusBadge(transaction.status)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Detalle de Transacción</h3>
              <p className="text-sm text-gray-500 font-mono">{transaction.id}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Fecha</p>
              <p className="font-bold">{new Date(transaction.createdAt).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-sm text-gray-600">{new Date(transaction.createdAt).toLocaleTimeString('es-MX')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-4xl font-bold text-green-600">{formatCurrency(transaction.total)}</p>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">Productos</h4>
            {transaction.items.length > 0 ? (
              <div className="space-y-2">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-500">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(Number(item.unitPrice) * item.quantity)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No hay productos registrados</p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">Información de Pago</h4>
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Método:</span>
                <span className="font-bold">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentMethod === 'MERCADOPAGO' && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Payment ID (Mercado Pago):</p>
                  <p className="font-mono text-sm bg-white px-2 py-1 rounded">{transaction.id}</p>
                </div>
              )}
              {transaction.paymentMethod === 'CASH' && (
                <>
                  {transaction.cashReceived && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recibido:</span>
                      <span className="font-bold">{formatCurrency(transaction.cashReceived)}</span>
                    </div>
                  )}
                  {transaction.change && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cambio:</span>
                      <span className="font-bold text-green-600">{formatCurrency(transaction.change)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Timeline</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm font-medium">Transacción creada</p>
                  <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleString('es-MX')}</p>
                </div>
              </div>
              {transaction.completedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm font-medium">Completada</p>
                    <p className="text-xs text-gray-500">{new Date(transaction.completedAt).toLocaleString('es-MX')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button 
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}