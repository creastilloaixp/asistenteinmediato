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

export function PricingPage({ currentPlan, onSelectPlan }: {
  currentPlan: string
  onSelectPlan: (plan: string) => void
}) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_URL}/billing/plans`)
      const data = await res.json()
      if (data.success) {
        setPlans(data.data.plans)
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Cargando planes...</div>
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Planes y Precios</h2>
        <p className="text-gray-500">Elige el plan perfecto para tu negocio</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {plans.map(plan => (
          <div 
            key={plan.id}
            className={`bg-white rounded-xl shadow-lg p-6 relative ${
              plan.highlighted ? 'ring-2 ring-purple-500 transform scale-105' : ''
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MAS POPULAR
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-800">
                  {plan.price.monthly === 0 ? 'Gratis' : `$${plan.price.monthly}`}
                </span>
                {plan.price.monthly > 0 && (
                  <span className="text-gray-500">/mes</span>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 mb-2">Límites:</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kioscos</span>
                  <span className="font-medium">{plan.limits.kiosks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Productos</span>
                  <span className="font-medium">{plan.limits.products}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transacciones</span>
                  <span className="font-medium">{plan.limits.transactions}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {plan.features.slice(0, 5).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {feature.included ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            {currentPlan === plan.id ? (
              <button
                disabled
                className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                Plan Actual
              </button>
            ) : plan.id === 'FREE' ? (
              <button
                className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Empezar Gratis
              </button>
            ) : plan.id === 'ENTERPRISE' ? (
              <button
                onClick={() => onSelectPlan(plan.id)}
                className="w-full py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
              >
                Contactar Ventas
              </button>
            ) : (
              <button
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full py-2 rounded-lg transition-colors ${
                  plan.highlighted 
                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Actualizar a {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}