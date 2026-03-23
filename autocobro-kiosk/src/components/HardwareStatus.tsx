import { useEffect, useState, useCallback } from 'react';
import { hardwareMonitor, HardwareMetrics } from '../services/hardwareMonitor';

interface StatusIndicatorProps {
  label: string;
  icon: React.ReactNode;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  showBar?: boolean;
  maxValue?: number;
}

function StatusIndicator({ label, icon, value, unit, status, showBar, maxValue = 100 }: StatusIndicatorProps) {
  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  const statusBgColors = {
    healthy: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
    unknown: 'bg-gray-50 border-gray-200',
  };

  const indicatorColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const percentage = Math.min(100, (numericValue / maxValue) * 100);

  return (
    <div className={`flex flex-col p-3 rounded-lg border ${statusBgColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${indicatorColors[status]} ${status === 'critical' ? 'animate-pulse' : ''}`} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold ${
          status === 'critical' ? 'text-red-700' :
          status === 'warning' ? 'text-yellow-700' :
          'text-gray-800'
        }`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      {showBar && (
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${statusColors[status]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function getCpuStatus(usage: number): 'healthy' | 'warning' | 'critical' {
  if (usage >= 90) return 'critical';
  if (usage >= 70) return 'warning';
  return 'healthy';
}

function getMemoryStatus(usage: number): 'healthy' | 'warning' | 'critical' {
  if (usage >= 90) return 'critical';
  if (usage >= 75) return 'warning';
  return 'healthy';
}

function getTemperatureStatus(temp: number): 'healthy' | 'warning' | 'critical' {
  if (temp >= 60) return 'critical';
  if (temp >= 45) return 'warning';
  return 'healthy';
}

function getStockStatus(stock: number | undefined): 'healthy' | 'warning' | 'critical' {
  if (stock === undefined) return 'healthy';
  if (stock <= 5) return 'critical';
  if (stock <= 20) return 'warning';
  return 'healthy';
}

function getPrinterStatus(status: string): 'healthy' | 'warning' | 'critical' {
  switch (status) {
    case 'ok': return 'healthy';
    case 'warning': return 'warning';
    case 'error': return 'critical';
    default: return 'healthy';
  }
}

function getNetworkStatus(status: string): 'healthy' | 'warning' | 'critical' {
  switch (status) {
    case 'online': return 'healthy';
    case 'slow': return 'warning';
    case 'offline': return 'critical';
    default: return 'critical';
  }
}

export function HardwareStatus() {
  const [metrics, setMetrics] = useState<HardwareMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = hardwareMonitor.onMetrics((newMetrics) => {
      setMetrics(newMetrics);
      setLastUpdate(new Date());
    });

    if (!hardwareMonitor.getLastMetrics()) {
      hardwareMonitor.start();
    } else {
      setMetrics(hardwareMonitor.getLastMetrics());
      setLastUpdate(new Date());
    }

    return () => { unsubscribe(); };
  }, []);

  const overallStatus = useCallback((): 'healthy' | 'warning' | 'critical' => {
    if (!metrics) return 'healthy';
    
    if (
      getCpuStatus(metrics.cpuUsage) === 'critical' ||
      getMemoryStatus(metrics.memoryUsage) === 'critical' ||
      getTemperatureStatus(metrics.temperature || 0) === 'critical' ||
      getNetworkStatus(metrics.networkStatus) === 'critical' ||
      getStockStatus(metrics.ticketStock) === 'critical' ||
      getStockStatus(metrics.paperStock) === 'critical'
    ) {
      return 'critical';
    }

    if (
      getCpuStatus(metrics.cpuUsage) === 'warning' ||
      getMemoryStatus(metrics.memoryUsage) === 'warning' ||
      getTemperatureStatus(metrics.temperature || 0) === 'warning' ||
      getNetworkStatus(metrics.networkStatus) === 'warning' ||
      getStockStatus(metrics.ticketStock) === 'warning' ||
      getStockStatus(metrics.paperStock) === 'warning'
    ) {
      return 'warning';
    }

    return 'healthy';
  }, [metrics]);

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Nunca';
    const diff = Date.now() - lastUpdate.getTime();
    if (diff < 1000) return 'Ahora';
    if (diff < 60000) return `Hace ${Math.floor(diff / 1000)}s`;
    return `Hace ${Math.floor(diff / 60000)}m`;
  };

  if (!metrics) {
    return (
      <div className="fixed bottom-[110px] md:bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Inicializando monitor...</span>
        </div>
      </div>
    );
  }

  const status = overallStatus();
  const statusConfig = {
    healthy: { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-300' },
    warning: { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-300' },
    critical: { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-300' },
  }[status];

  return (
    <div className={`fixed bottom-[110px] md:bottom-4 right-4 z-50 ${isExpanded ? 'w-80' : 'w-auto'}`}>
      <div className={`bg-white rounded-lg shadow-lg border-2 ${statusConfig.border} overflow-hidden transition-all duration-300`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between p-3 ${statusConfig.bg} text-white`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full bg-white ${status === 'critical' ? 'animate-pulse' : ''}`} />
            <span className="font-semibold text-sm">
              {status === 'critical' ? '⚠️ Alerta' : status === 'warning' ? '⚡ Precaución' : '✓ Normal'}
            </span>
          </div>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <StatusIndicator
                label="CPU"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
                value={metrics.cpuUsage}
                unit="%"
                status={getCpuStatus(metrics.cpuUsage)}
                showBar
              />
              <StatusIndicator
                label="RAM"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                value={metrics.memoryUsage}
                unit="%"
                status={getMemoryStatus(metrics.memoryUsage)}
                showBar
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatusIndicator
                label="WiFi"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>}
                value={metrics.networkStatus === 'online' ? 'Conectado' : metrics.networkStatus === 'slow' ? 'Lento' : 'Offline'}
                status={getNetworkStatus(metrics.networkStatus)}
              />
              <StatusIndicator
                label="Impresora"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
                value={metrics.printerStatus === 'ok' ? 'OK' : metrics.printerStatus === 'warning' ? 'Advertencia' : metrics.printerStatus === 'error' ? 'Error' : 'N/A'}
                status={getPrinterStatus(metrics.printerStatus)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatusIndicator
                label="Tickets"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                value={metrics.ticketStock ?? '?'}
                status={getStockStatus(metrics.ticketStock)}
              />
              <StatusIndicator
                label="Papel"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                value={metrics.paperStock ?? '?'}
                status={getStockStatus(metrics.paperStock)}
              />
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Última actualización: {formatLastUpdate()}</span>
              </div>
            </div>
          </div>
        )}

        {!isExpanded && (
          <div className="px-3 py-2 bg-gray-50 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${metrics.cpuUsage >= 70 ? (metrics.cpuUsage >= 90 ? 'bg-red-500' : 'bg-yellow-500') : 'bg-green-500'}`} />
              <span className="text-xs text-gray-600">CPU</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${metrics.memoryUsage >= 75 ? (metrics.memoryUsage >= 90 ? 'bg-red-500' : 'bg-yellow-500') : 'bg-green-500'}`} />
              <span className="text-xs text-gray-600">RAM</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${metrics.networkStatus === 'offline' ? 'bg-red-500' : metrics.networkStatus === 'slow' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className="text-xs text-gray-600">WiFi</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getPrinterStatus(metrics.printerStatus) === 'critical' ? 'bg-red-500' : getPrinterStatus(metrics.printerStatus) === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className="text-xs text-gray-600">Print</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HardwareStatus;
