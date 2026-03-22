import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Plus, Search, Edit, Trash2, TrendingUp, DollarSign, ShoppingBag, Clock,
  BarChart3, ChevronDown, X, AlertCircle, CheckCircle, Wifi, WifiOff, Sparkles, MessageSquare, Lightbulb,
  CreditCard, Store, ChevronRight, Star, Crown, Zap, Monitor, Activity, AlertTriangle, Thermometer, Printer, Battery,
  FileText, Download, TrendingDown, Eye, RefreshCw
} from 'lucide-react';
import { PlanBadge } from '../components/PlanBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, StoreData, Plan, Product, TopProduct, Transaction, ActivityLog, Customer, CustomerHistory, Tab } from '../types';
import { RealtimeTransaction } from '../hooks/useRealtime';

const API_URL = 'http://localhost:4000/api';

export function StoresPage({ stores, onSwitch, onAddNew }: {
  stores: StoreData[]
  onSwitch: (id: string) => void
  onAddNew: () => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Mis Tiendas</h2>
        <button 
          onClick={onAddNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nueva Tienda
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {stores.map(store => (
          <div key={store.id} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{store.name}</h3>
                  <PlanBadge plan={store.plan} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{store._count?.products || 0}</p>
                <p className="text-xs text-gray-500">Productos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{store._count?.kiosks || 0}/{store.maxKiosks}</p>
                <p className="text-xs text-gray-500">Kioscos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{store._count?.users || 0}</p>
                <p className="text-xs text-gray-500">Usuarios</p>
              </div>
            </div>

            {store.subscription && (
              <p className="text-sm text-gray-500 mb-4">
                Vence: {new Date(store.subscription.currentPeriodEnd).toLocaleDateString('es-MX')}
              </p>
            )}

            <button 
              onClick={() => onSwitch(store.id)}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Gestionar Tienda
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}