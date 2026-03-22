import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Plus, Search, Edit, Trash2, TrendingUp, DollarSign, ShoppingBag, Clock,
  BarChart3, ChevronDown, X, AlertCircle, CheckCircle, Wifi, WifiOff, Sparkles, MessageSquare, Lightbulb,
  CreditCard, Store, ChevronRight, Star, Crown, Zap, Monitor, Activity, AlertTriangle, Thermometer, Printer, Battery,
  FileText, Download, TrendingDown, Eye, RefreshCw, ScanLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, StoreData, Plan, Product, TopProduct, Transaction, ActivityLog, Customer, CustomerHistory, Tab } from '../types';
import { RealtimeTransaction } from '../hooks/useRealtime';

const API_URL = 'http://localhost:4000/api';

import { ProductModal } from '../components/ProductModal';
export function ProductsPage({ products, onAdd, onEdit, onDelete }: { 
  products: Product[]; onAdd: () => void; onEdit: (p: Product) => void; onDelete: (id: string) => void 
}) {
  const [search, setSearch] = useState('')
  const formatCurrency = (v: string | number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v))

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-120px)]"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Catálogo de Productos</h2>
          <p className="text-slate-500 font-medium">Gestiona tu inventario, precios y categorías.</p>
        </div>
        <motion.button 
          onClick={onAdd}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </motion.button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, código de barras o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider w-1/3">Producto</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <motion.tbody 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="divide-y divide-slate-100"
            >
              <AnimatePresence>
                {filtered.map((p) => (
                  <motion.tr 
                    key={p.id}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    exit={{ opacity: 0, x: -10 }}
                    whileHover={{ backgroundColor: '#f8fafc' }}
                    className="group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-lg leading-tight">{p.name}</div>
                      {p.barcode ? (
                        <div className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-1">
                          <ScanLine className="w-3 h-3" /> {p.barcode}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-amber-500 mt-1">Sin código de barras</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700">
                        {p.category || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${
                        p.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 text-lg">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button 
                          onClick={() => onEdit(p)} 
                          className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                          whileTap={{ scale: 0.9 }}
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </motion.button>
                        <motion.button 
                          onClick={() => {
                            if (window.confirm('¿Seguro que deseas eliminar este producto?')) {
                              onDelete(p.id)
                            }
                          }} 
                          className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                          whileTap={{ scale: 0.9 }}
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                      <Package size={48} strokeWidth={1} />
                      <p className="font-medium text-lg">No se encontraron productos</p>
                    </div>
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}