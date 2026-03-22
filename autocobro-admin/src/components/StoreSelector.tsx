import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Plus, Search, Edit, Trash2, TrendingUp, DollarSign, ShoppingBag, Clock,
  BarChart3, ChevronDown, X, AlertCircle, CheckCircle, Wifi, WifiOff, Sparkles, MessageSquare, Lightbulb,
  CreditCard, Store, ChevronRight, Star, Crown, Zap, Monitor, Activity, AlertTriangle, Thermometer, Printer, Battery,
  FileText, Download, TrendingDown, Eye, RefreshCw
} from 'lucide-react';
import { PlanBadge } from './PlanBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, StoreData, Plan, Product, TopProduct, Transaction, ActivityLog, Customer, CustomerHistory, Tab } from '../types';
import { RealtimeTransaction } from '../hooks/useRealtime';

const API_URL = 'http://localhost:4000/api';

export function StoreSelector({ stores, currentStoreId, onSelect, onClose, onAddNew }: {
  stores: StoreData[]
  currentStoreId?: string
  onSelect: (id: string) => void
  onClose: () => void
  onAddNew: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Seleccionar Tienda</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => onSelect(store.id)}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                store.id === currentStoreId 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 rounded-lg p-2">
                  <Store className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{store.name}</p>
                  <p className="text-sm text-gray-500">{store._count?.products || 0} productos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PlanBadge plan={store.plan} />
                {store.id === currentStoreId && <CheckCircle className="w-5 h-5 text-blue-500" />}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Agregar Nueva Tienda
        </button>
      </div>
    </div>
  )
}