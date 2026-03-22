import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Plus, Search, Edit, Trash2, TrendingUp, DollarSign, ShoppingBag, Clock,
  BarChart3, ChevronDown, X, AlertCircle, CheckCircle, Wifi, WifiOff, Sparkles, MessageSquare, Lightbulb,
  CreditCard, Store, ChevronRight, Star, Crown, Zap, Monitor, Activity, AlertTriangle, Thermometer, Printer, Battery,
  FileText, Download, TrendingDown, Eye, RefreshCw
} from 'lucide-react';
import { KioskHealthData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { User, StoreData, Plan, Product, TopProduct, Transaction, ActivityLog, Customer, CustomerHistory, Tab } from '../types';
import { RealtimeTransaction } from '../hooks/useRealtime';

const API_URL = 'http://localhost:4000/api';

interface DevicesPageProps { storeId: string | null; token: string | null; }

export function DevicesPage({ storeId, token }: DevicesPageProps) {
  const [kiosks, setKiosks] = useState<KioskHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKiosk, setSelectedKiosk] = useState<KioskHealthData | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const API_URL = 'http://localhost:4000/api';

  useEffect(() => {
    fetchKiosksHealth();
  }, [storeId, token]);

  const fetchKiosksHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/kiosks/store/${storeId}/health/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setKiosks(data.data.kiosks);
      }
    } catch (err) {
      console.error('Failed to fetch kiosks health:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKioskAlerts = async (kioskId: string) => {
    try {
      setLoadingAlerts(true);
      const res = await fetch(`${API_URL}/kiosks/${kioskId}/alerts?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleKioskClick = async (kiosk: KioskHealthData) => {
    setSelectedKiosk(kiosk);
    await fetchKioskAlerts(kiosk.id);
  };

  const acknowledgeAlert = async (alertId: string) => {
    if (!selectedKiosk) return;
    try {
      const res = await fetch(`${API_URL}/kiosks/${selectedKiosk.id}/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
        setKiosks(prev => prev.map(k => 
          k.id === selectedKiosk.id 
            ? { ...k, unacknowledgedAlerts: Math.max(0, k.unacknowledgedAlerts - 1) }
            : k
        ));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Nunca';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Hace menos de 1 min';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return new Date(lastSeen).toLocaleDateString('es-MX');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-500';
      case 'OFFLINE': return 'bg-red-500';
      case 'MAINTENANCE': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600 bg-green-50';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50';
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARNING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const onlineKiosks = kiosks.filter(k => k.status === 'ONLINE').length;
  const offlineKiosks = kiosks.filter(k => k.status === 'OFFLINE').length;
  const totalAlerts = kiosks.reduce((sum, k) => sum + k.unacknowledgedAlerts, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Estado del Dispositivo</h2>
        <button
          onClick={fetchKiosksHealth}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Activity className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{kiosks.length}</p>
              <p className="text-sm text-gray-500">Total Kioscos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{onlineKiosks}</p>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <WifiOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{offlineKiosks}</p>
              <p className="text-sm text-gray-500">Offline</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalAlerts > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${totalAlerts > 0 ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalAlerts}</p>
              <p className="text-sm text-gray-500">Alertas Activas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-800">Kioscos</h3>
          </div>
          <div className="divide-y">
            {kiosks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay kioscos registrados
              </div>
            ) : (
              kiosks.map(kiosk => {
                const latestHealth = kiosk.healthRecords[0];
                return (
                  <div
                    key={kiosk.id}
                    onClick={() => handleKioskClick(kiosk)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedKiosk?.id === kiosk.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(kiosk.status)} ${
                          kiosk.status === 'ONLINE' ? '' : 'animate-pulse'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-800">{kiosk.deviceName}</p>
                          <p className="text-sm text-gray-500">
                            {kiosk.status === 'ONLINE' ? 'Online' : kiosk.status === 'OFFLINE' ? 'Offline' : 'Mantenimiento'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{formatLastSeen(kiosk.lastSeen)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {latestHealth && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getHealthStatusColor(latestHealth.healthStatus)}`}>
                              {latestHealth.healthStatus === 'HEALTHY' ? 'Saludable' :
                               latestHealth.healthStatus === 'WARNING' ? 'Advertencia' :
                               latestHealth.healthStatus === 'CRITICAL' ? 'Crítico' : 'Desconocido'}
                            </span>
                          )}
                          {kiosk.unacknowledgedAlerts > 0 && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                              {kiosk.unacknowledgedAlerts} alerta(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {latestHealth && (
                      <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">CPU: {latestHealth.cpuUsage.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Battery className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">RAM: {latestHealth.memoryUsage.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Print: {latestHealth.printerStatus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600">Uptime: {kiosk.uptimePercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-800">
              {selectedKiosk ? `Alertas: ${selectedKiosk.deviceName}` : 'Selecciona un kiosco'}
            </h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {!selectedKiosk ? (
              <p className="text-center text-gray-500 py-8">
                Selecciona un kiosco para ver sus alertas
              </p>
            ) : loadingAlerts ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600">Sin alertas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertSeverityColor(alert.severity)} ${
                      alert.acknowledged ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {new Date(alert.createdAt).toLocaleString('es-MX')}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-xs bg-white px-2 py-1 rounded border border-current opacity-75 hover:opacity-100"
                        >
                          OK
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedKiosk && (
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Métricas en Tiempo Real</h3>
          <div className="grid grid-cols-6 gap-4">
            {selectedKiosk.healthRecords[0] && (() => {
              const h = selectedKiosk.healthRecords[0];
              return (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-blue-500 flex items-center justify-center">
                      <span className="text-lg font-bold">{h.cpuUsage.toFixed(0)}%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">CPU</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-purple-500 flex items-center justify-center">
                      <span className="text-lg font-bold">{h.memoryUsage.toFixed(0)}%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">RAM</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-green-500 flex items-center justify-center">
                      <span className="text-lg font-bold">{h.ticketStock ?? '-'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Tickets</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-yellow-500 flex items-center justify-center">
                      <span className="text-lg font-bold">{h.paperStock ?? '-'}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Papel</p>
                  </div>
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full border-4 flex items-center justify-center ${
                      h.printerStatus === 'ok' ? 'border-green-500' :
                      h.printerStatus === 'warning' ? 'border-yellow-500' : 'border-red-500'
                    }`}>
                      <Printer className={`w-6 h-6 ${
                        h.printerStatus === 'ok' ? 'text-green-500' :
                        h.printerStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'
                      }`} />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Impresora</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full border-4 border-teal-500 flex items-center justify-center">
                      <span className="text-lg font-bold">{selectedKiosk.uptimePercentage.toFixed(1)}%</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Uptime 24h</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}