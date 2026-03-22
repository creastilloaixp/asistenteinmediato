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
import { API_URL } from '../config';


export function SettingsPage({ user, store }: { user: User | null; store: StoreData }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración</h2>
      
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">Información de la Cuenta</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Nombre</label>
            <p className="text-gray-800">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-800">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Rol</label>
            <p className="text-gray-800">{user?.role}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">Información de la Tienda</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Nombre</label>
            <p className="text-gray-800">{store.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Plan</label>
            <div className="flex items-center gap-2">
              <PlanBadge plan={store.plan} />
              <span className="text-gray-800">{store.plan}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono text-gray-600">
                {store.apiKey || 'No disponible'}
              </code>
              <button 
                onClick={() => navigator.clipboard.writeText(store.apiKey || '')}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-bold text-gray-800 mb-4">Límites del Plan</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Productos</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, ((store._count?.products || 0) / store.maxProducts) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {store._count?.products || 0}/{store.maxProducts}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Kioscos</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, ((store._count?.kiosks || 0) / store.maxKiosks) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {store._count?.kiosks || 0}/{store.maxKiosks}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}