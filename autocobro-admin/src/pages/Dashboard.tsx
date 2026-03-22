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
import { AiInsightsWidget } from '../components/AiInsightsWidget';
import { PlanBadge } from '../components/PlanBadge';
import { LiveIndicator } from '../components/LiveIndicator';

export function Dashboard({ stats, transactions, liveTransactions, topProducts, onNavigate, isConnected, onReconnect, store, token }: { 
  stats: any; 
  transactions: Transaction[]; 
  liveTransactions: Transaction[];
  topProducts: TopProduct[]; 
  onNavigate: (tab: Tab) => void;
  isConnected: boolean;
  onReconnect: () => void;
  store: StoreData;
  token: string;
}) {
  const formatCurrency = (v: number | string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v))

  const statCards = [
    { 
      label: 'Ventas Totales', 
      value: formatCurrency(stats.totalSales || 0), 
      icon: DollarSign, 
      color: 'from-emerald-400 to-emerald-600',
      shadow: 'shadow-emerald-200',
      subtext: `${stats.totalTransactions || 0} transacciones`
    },
    { 
      label: 'Ticket Promedio', 
      value: formatCurrency(stats.averageTicket || 0), 
      icon: TrendingUp, 
      color: 'from-blue-400 to-blue-600',
      shadow: 'shadow-blue-200',
      subtext: 'por compra'
    },
    { 
      label: 'Total Transacciones', 
      value: stats.totalTransactions || 0, 
      icon: ShoppingBag, 
      color: 'from-violet-400 to-violet-600',
      shadow: 'shadow-violet-200',
      subtext: 'completadas'
    },
    { 
      label: 'Kioscos Activos', 
      value: `${store._count?.kiosks || 0}/${store.maxKiosks}`, 
      icon: Monitor, 
      color: 'from-amber-400 to-orange-500',
      shadow: 'shadow-orange-200',
      subtext: 'en línea'
    },
  ];

  const salesByPayment = stats.salesByPayment || {}
  const totalByPaymentValues = Object.values(salesByPayment);
  const totalByPayment = totalByPaymentValues.reduce((a: number, b: unknown) => a + (Number(b) || 0), 0)
  
  const paymentMethods = [
    { key: 'CASH', label: 'Efectivo', color: 'bg-green-500', icon: '💵' },
    { key: 'CARD', label: 'Tarjeta', color: 'bg-blue-500', icon: '💳' },
    { key: 'QR', label: 'QR Código', color: 'bg-orange-500', icon: '📲' },
    { key: 'MERCADOPAGO', label: 'Mercado Pago', color: 'bg-cyan-500', icon: '🔵' },
    { key: 'STRIPE', label: 'Stripe', color: 'bg-violet-500', icon: '💠' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Vista General</h2>
          <p className="text-slate-500 font-medium">Monitorea el estado de {store.name} en tiempo real.</p>
        </div>
        <LiveIndicator isConnected={isConnected} onReconnect={onReconnect} />
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
            }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={`bg-gradient-to-br ${stat.color} rounded-3xl p-6 text-white shadow-xl ${stat.shadow} relative overflow-hidden`}
          >
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-white/80 font-bold mb-1 text-sm uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-4xl font-black">{stat.value}</h3>
                <p className="text-xs text-white/70 font-medium mt-2">{stat.subtext}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico/Actividad Reciente en Vivo */}
        <motion.div 
          className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-[500px]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-500" /> Transacciones en Vivo
            </h3>
            <button onClick={() => onNavigate('transactions')} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg">
              Ver todas
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">
            <AnimatePresence initial={false}>
              {liveTransactions.slice(0, 10).map((t) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-400 text-2xl border border-slate-100">
                      {t.paymentMethod === 'CASH' ? '💵' : t.paymentMethod === 'MERCADOPAGO' ? '📱' : '💳'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        {t.items.length} producto{t.items.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        {new Date(t.createdAt).toLocaleTimeString()} • Ticket #{t.id.slice(0,6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600 text-xl">{formatCurrency(t.total)}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                      {t.paymentMethod}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {liveTransactions.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <Clock size={48} strokeWidth={1.5} className="text-slate-300" />
                <p className="font-medium text-lg">Esperando transacciones...</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Columna Derecha: Top Productos & Payment Methods */}
        <div className="space-y-6 flex flex-col h-[500px]">
          <motion.div 
            className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex-1 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star className="text-amber-400 fill-amber-400 w-5 h-5" /> Top Productos
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-4 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-100 text-slate-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-800 line-clamp-1 flex-1 pr-2 text-sm">{p.productName}</p>
                      <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                        {p.totalQuantity}u
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <motion.div 
                        className="bg-amber-400 h-1.5 rounded-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(10, (p.totalQuantity / (topProducts[0]?.totalQuantity || 1)) * 100)}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-slate-400 text-center py-4 font-medium text-sm">No hay datos de ventas</p>
              )}
            </div>
          </motion.div>

          <motion.div 
            className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex-1 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" /> Métodos de Pago
            </h3>
            {totalByPayment === 0 ? (
              <p className="text-slate-400 text-center py-4 font-medium text-sm my-auto">Sin datos de ventas</p>
            ) : (
              <div className="space-y-3 overflow-y-auto no-scrollbar pr-2">
                {paymentMethods.map(({ key, label, color, icon }) => {
                  const amount = salesByPayment[key] || 0
                  if (amount === 0) return null;
                  const pct = totalByPayment > 0 ? (amount / totalByPayment * 100) : 0
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="flex items-center gap-2">
                          <span>{icon}</span>
                          <span className="text-sm font-bold text-slate-700">{label}</span>
                        </span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <motion.div 
                          className={`${color} h-1.5 rounded-full transition-all`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: 0.6 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Widget de Insights IA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <AiInsightsWidget token={token} storeId={store.id} />
      </motion.div>
    </div>
  );
}