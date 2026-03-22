export interface HardwareMetrics {
  cpuUsage: number;
  memoryUsage: number;
  temperature?: number;
  batteryLevel?: number;
  batteryCharging: boolean;
  networkStatus: 'online' | 'offline' | 'slow';
  printerStatus: 'ok' | 'warning' | 'error' | 'unknown';
  cashDrawerStatus: 'ok' | 'warning' | 'error' | 'unknown';
  ticketStock?: number;
  paperStock?: number;
  timestamp: number;
}

export interface HardwareMonitorConfig {
  heartbeatInterval: number;
  healthCheckInterval: number;
  alertThresholds: {
    cpuWarning: number;
    cpuCritical: number;
    memoryWarning: number;
    memoryCritical: number;
    tempWarning: number;
    tempCritical: number;
  };
  apiBaseUrl: string;
  kioskId?: string;
  deviceKey?: string;
}

const DEFAULT_CONFIG: HardwareMonitorConfig = {
  heartbeatInterval: 30000,
  healthCheckInterval: 10000,
  alertThresholds: {
    cpuWarning: 70,
    cpuCritical: 90,
    memoryWarning: 75,
    memoryCritical: 90,
    tempWarning: 45,
    tempCritical: 60,
  },
  apiBaseUrl: 'http://localhost:4000/api',
};

type MetricCallback = (metrics: HardwareMetrics) => void;
type AlertCallback = (alert: { type: string; severity: 'warning' | 'critical'; message: string }) => void;

class HardwareMonitor {
  private config: HardwareMonitorConfig;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private healthCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private metricCallbacks: Set<MetricCallback> = new Set();
  private alertCallbacks: Set<AlertCallback> = new Set();
  private lastMetrics: HardwareMetrics | null = null;
  private isRunning: boolean = false;
  private offlineSince: number | null = null;

  constructor(config: Partial<HardwareMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  configure(config: Partial<HardwareMonitorConfig>) {
    this.config = { ...this.config, ...config };
  }

  onMetrics(callback: MetricCallback) {
    this.metricCallbacks.add(callback);
    return () => this.metricCallbacks.delete(callback);
  }

  onAlert(callback: AlertCallback) {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  private collectBrowserMetrics(): HardwareMetrics {
    const memory = this.getMemoryUsage();
    const networkStatus = this.getNetworkStatus();
    const battery = this.getBatteryInfo();

    const metrics: HardwareMetrics = {
      cpuUsage: this.simulateCpuUsage(),
      memoryUsage: memory.usage,
      temperature: this.simulateTemperature(),
      batteryLevel: battery.level,
      batteryCharging: battery.charging,
      networkStatus,
      printerStatus: this.checkPrinterStatus(),
      cashDrawerStatus: this.checkCashDrawerStatus(),
      ticketStock: this.simulateTicketStock(),
      paperStock: this.simulatePaperStock(),
      timestamp: Date.now(),
    };

    return metrics;
  }

  private getMemoryUsage(): { usage: number; total: number; available: number } {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const total = memInfo.jsHeapSizeLimit;
      const used = memInfo.usedJSHeapSize;
      const available = total - used;
      const usage = (used / total) * 100;
      return { usage, total, available };
    }
    return { usage: this.simulateMemoryUsage(), total: 100, available: 50 };
  }

  private getNetworkStatus(): 'online' | 'offline' | 'slow' {
    const connection = (navigator as any).connection;
    if (!navigator.onLine) return 'offline';
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';
    }
    return 'online';
  }

  private getBatteryInfo(): { level: number; charging: boolean } {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.lastMetrics = {
          ...this.lastMetrics!,
          batteryLevel: battery.level * 100,
          batteryCharging: battery.charging,
        } as HardwareMetrics;
      }).catch(() => {});
    }
    return {
      level: this.lastMetrics?.batteryLevel ?? 100,
      charging: this.lastMetrics?.batteryCharging ?? false,
    };
  }

  private simulateCpuUsage(): number {
    const baseUsage = 20 + Math.random() * 30;
    const variance = Math.sin(Date.now() / 5000) * 10;
    return Math.max(5, Math.min(95, baseUsage + variance));
  }

  private simulateMemoryUsage(): number {
    const baseUsage = 40 + Math.random() * 25;
    return Math.max(10, Math.min(90, baseUsage));
  }

  private simulateTemperature(): number {
    const baseTemp = 35 + Math.random() * 15;
    return Math.max(25, Math.min(70, baseTemp));
  }

  private checkPrinterStatus(): 'ok' | 'warning' | 'error' | 'unknown' {
    if ('usb' in navigator) return 'ok';
    return 'unknown';
  }

  private checkCashDrawerStatus(): 'ok' | 'warning' | 'error' | 'unknown' {
    return 'unknown';
  }

  private simulateTicketStock(): number {
    const stored = localStorage.getItem('kiosk_ticket_stock');
    if (stored) {
      const stock = parseInt(stored, 10);
      return Math.max(0, stock - Math.floor(Math.random() * 2));
    }
    return 100;
  }

  private simulatePaperStock(): number {
    const stored = localStorage.getItem('kiosk_paper_stock');
    if (stored) {
      const stock = parseInt(stored, 10);
      return Math.max(0, stock - Math.floor(Math.random() * 3));
    }
    return 100;
  }

  private evaluateAlerts(metrics: HardwareMetrics): void {
    const { cpuUsage, memoryUsage, temperature, ticketStock, paperStock, networkStatus, printerStatus } = metrics;

    if (cpuUsage >= this.config.alertThresholds.cpuCritical) {
      this.emitAlert('CPU_CRITICAL', 'critical', `CPU crítico: ${cpuUsage.toFixed(1)}%`);
    } else if (cpuUsage >= this.config.alertThresholds.cpuWarning) {
      this.emitAlert('CPU_WARNING', 'warning', `CPU elevado: ${cpuUsage.toFixed(1)}%`);
    }

    if (memoryUsage >= this.config.alertThresholds.memoryCritical) {
      this.emitAlert('MEMORY_CRITICAL', 'critical', `Memoria crítica: ${memoryUsage.toFixed(1)}%`);
    } else if (memoryUsage >= this.config.alertThresholds.memoryWarning) {
      this.emitAlert('MEMORY_WARNING', 'warning', `Memoria elevada: ${memoryUsage.toFixed(1)}%`);
    }

    if (temperature && temperature >= this.config.alertThresholds.tempCritical) {
      this.emitAlert('TEMPERATURE_CRITICAL', 'critical', `Temperatura crítica: ${temperature.toFixed(1)}°C`);
    } else if (temperature && temperature >= this.config.alertThresholds.tempWarning) {
      this.emitAlert('TEMPERATURE_WARNING', 'warning', `Temperatura elevada: ${temperature.toFixed(1)}°C`);
    }

    if (ticketStock !== undefined && ticketStock <= 5) {
      this.emitAlert('TICKET_STOCK_CRITICAL', 'critical', `Tickets agotados: ${ticketStock} restantes`);
    } else if (ticketStock !== undefined && ticketStock <= 20) {
      this.emitAlert('TICKET_STOCK_LOW', 'warning', `Tickets bajos: ${ticketStock} restantes`);
    }

    if (paperStock !== undefined && paperStock <= 5) {
      this.emitAlert('PAPER_STOCK_CRITICAL', 'critical', `Papel agotado: ${paperStock} restantes`);
    } else if (paperStock !== undefined && paperStock <= 20) {
      this.emitAlert('PAPER_STOCK_LOW', 'warning', `Papel bajo: ${paperStock} restantes`);
    }

    if (networkStatus === 'offline') {
      this.emitAlert('NETWORK_OFFLINE', 'critical', 'Conexión de red perdida');
    } else if (networkStatus === 'slow') {
      this.emitAlert('NETWORK_SLOW', 'warning', 'Conexión lenta detectada');
    }

    if (printerStatus === 'error') {
      this.emitAlert('PRINTER_ERROR', 'critical', 'Error en impresora térmica');
    } else if (printerStatus === 'warning') {
      this.emitAlert('PRINTER_WARNING', 'warning', 'Impresora con problemas');
    }
  }

  private emitAlert(type: string, severity: 'warning' | 'critical', message: string) {
    this.alertCallbacks.forEach((callback) => callback({ type, severity, message }));
  }

  private async sendHeartbeat(metrics: HardwareMetrics): Promise<void> {
    if (!this.config.kioskId) return;

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/kiosks/${this.config.kioskId}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        console.warn('Failed to send health metrics:', response.status);
      }
    } catch (error) {
      console.warn('Error sending health metrics:', error);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = () => {
      const metrics = this.collectBrowserMetrics();
      this.lastMetrics = metrics;

      this.metricCallbacks.forEach((callback) => callback(metrics));

      this.evaluateAlerts(metrics);

      if (this.config.kioskId) {
        this.sendHeartbeat(metrics);
      }

      if (metrics.networkStatus === 'offline' && !this.offlineSince) {
        this.offlineSince = Date.now();
      } else if (metrics.networkStatus !== 'offline' && this.offlineSince) {
        this.offlineSince = null;
      }
    };

    tick();

    this.healthCheckIntervalId = setInterval(tick, this.config.healthCheckInterval);
  }

  stop() {
    this.isRunning = false;
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  getLastMetrics(): HardwareMetrics | null {
    return this.lastMetrics;
  }

  isOnline(): boolean {
    return this.lastMetrics?.networkStatus !== 'offline';
  }

  getOfflineDuration(): number | null {
    if (!this.offlineSince) return null;
    return Date.now() - this.offlineSince;
  }

  updateStock(type: 'ticket' | 'paper', quantity: number) {
    const key = `kiosk_${type}_stock`;
    localStorage.setItem(key, Math.max(0, quantity).toString());
  }
}

export const hardwareMonitor = new HardwareMonitor();

/**
 * ESP32 HARDWARE INTEGRATION NOTES:
 * 
 * For real hardware integration with ESP32 sensors, implement WebSerial or WebBLE:
 * 
 * 1. TEMPERATURE SENSOR (DS18B20 / DHT22):
 *    - Connect via 1-Wire protocol to ESP32 GPIO
 *    - Use WebSerial to read serial output from ESP32
 *    - Example serial output: "TEMP:35.5,HUM:65.2"
 * 
 * 2. BATTERY MONITORING (INA219 / Voltage Divider):
 *    - Connect voltage sensor to ESP32 ADC
 *    - Calculate battery percentage from voltage
 *    - Send via serial: "BATT:85,CHG:true"
 * 
 * 3. PAPER/TICKET SENSORS (IR Sensor):
 *    - Connect IR reflective sensor to ESP32 GPIO
 *    - Count paper sheets passing through
 *    - ESP32 sends: "PAPER:75,TICKETS:150"
 * 
 * 4. PRINTER STATUS:
 *    - ESC/POS printer status via USB
 *    - Use WebUSB API for direct communication
 *    - Monitor paper out, cover open, error states
 * 
 * 5. CASH DRAWER:
 *    - Magnetic reed switch on drawer
 *    - Connect to ESP32 interrupt pin
 *    - Detect open/close events
 * 
 * IMPLEMENTATION EXAMPLE:
 * 
 * ```typescript
 * // serialService.ts
 * class SerialMonitor {
 *   private port: SerialPort | null = null;
 *   private reader: ReadableStreamDefaultReader | null = null;
 * 
 *   async connect(): Promise<void> {
 *     this.port = await navigator.serial.requestPort();
 *     await this.port.open({ baudRate: 115200 });
 *     this.readLoop();
 *   }
 * 
 *   private async readLoop() {
 *     this.reader = this.port?.readable?.getReader();
 *     while (true) {
 *       const { value } = await this.reader!.read();
 *       const data = new TextDecoder().decode(value);
 *       this.parseAndUpdateMetrics(data);
 *     }
 *   }
 * 
 *   private parseAndUpdateMetrics(data: string) {
 *     // Parse "TEMP:35.5,HUM:65.2,BATT:85,CHG:false,PAPER:75,TICKETS:150"
 *     const parts = data.split(',');
 *     const metrics: Record<string, string> = {};
 *     parts.forEach(p => {
 *       const [key, value] = p.split(':');
 *       metrics[key] = value;
 *     });
 * 
 *     hardwareMonitor.updateFromESP32({
 *       temperature: parseFloat(metrics.TEMP),
 *       batteryLevel: parseFloat(metrics.BATT),
 *       batteryCharging: metrics.CHG === 'true',
 *       paperStock: parseInt(metrics.PAPER),
 *       ticketStock: parseInt(metrics.TICKETS),
 *     });
 *   }
 * }
 * ```
 */

export default hardwareMonitor;
