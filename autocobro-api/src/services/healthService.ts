import { PrismaClient, HealthStatus, AlertSeverity, KioskStatus } from '@prisma/client';

export interface KioskHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  temperature?: number;
  batteryLevel?: number;
  batteryCharging?: boolean;
  networkStatus?: string;
  printerStatus?: string;
  cashDrawerStatus?: string;
  ticketStock?: number;
  paperStock?: number;
  metadata?: Record<string, any>;
}

export interface HealthThresholds {
  cpuWarning: number;
  cpuCritical: number;
  memoryWarning: number;
  memoryCritical: number;
  tempWarning: number;
  tempCritical: number;
  ticketLowWarning: number;
  ticketCritical: number;
  paperLowWarning: number;
  paperCritical: number;
}

const DEFAULT_THRESHOLDS: HealthThresholds = {
  cpuWarning: 70,
  cpuCritical: 90,
  memoryWarning: 75,
  memoryCritical: 90,
  tempWarning: 45,
  tempCritical: 60,
  ticketLowWarning: 20,
  ticketCritical: 5,
  paperLowWarning: 20,
  paperCritical: 5,
};

export class HealthService {
  private prisma: PrismaClient;
  private thresholds: HealthThresholds;

  constructor(prisma: PrismaClient, thresholds?: Partial<HealthThresholds>) {
    this.prisma = prisma;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  evaluateHealthStatus(metrics: KioskHealthMetrics): HealthStatus {
    const {
      cpuUsage,
      memoryUsage,
      temperature,
      printerStatus,
      cashDrawerStatus,
      ticketStock,
      paperStock,
    } = metrics;

    if (
      cpuUsage >= this.thresholds.cpuCritical ||
      memoryUsage >= this.thresholds.memoryCritical ||
      (temperature && temperature >= this.thresholds.tempCritical) ||
      printerStatus === 'error' ||
      cashDrawerStatus === 'error' ||
      (ticketStock !== undefined && ticketStock <= this.thresholds.ticketCritical) ||
      (paperStock !== undefined && paperStock <= this.thresholds.paperCritical)
    ) {
      return HealthStatus.CRITICAL;
    }

    if (
      cpuUsage >= this.thresholds.cpuWarning ||
      memoryUsage >= this.thresholds.memoryWarning ||
      (temperature && temperature >= this.thresholds.tempWarning) ||
      printerStatus === 'warning' ||
      cashDrawerStatus === 'warning' ||
      (ticketStock !== undefined && ticketStock <= this.thresholds.ticketLowWarning) ||
      (paperStock !== undefined && paperStock <= this.thresholds.paperLowWarning)
    ) {
      return HealthStatus.WARNING;
    }

    return HealthStatus.HEALTHY;
  }

  checkForAlerts(
    metrics: KioskHealthMetrics,
    previousStatus?: HealthStatus
  ): { type: string; severity: AlertSeverity; message: string }[] {
    const alerts: { type: string; severity: AlertSeverity; message: string }[] = [];

    if (metrics.cpuUsage >= this.thresholds.cpuCritical) {
      alerts.push({
        type: 'CPU_CRITICAL',
        severity: AlertSeverity.CRITICAL,
        message: `CPU crítico: ${metrics.cpuUsage.toFixed(1)}%`,
      });
    } else if (metrics.cpuUsage >= this.thresholds.cpuWarning) {
      alerts.push({
        type: 'CPU_WARNING',
        severity: AlertSeverity.WARNING,
        message: `CPU elevado: ${metrics.cpuUsage.toFixed(1)}%`,
      });
    }

    if (metrics.memoryUsage >= this.thresholds.memoryCritical) {
      alerts.push({
        type: 'MEMORY_CRITICAL',
        severity: AlertSeverity.CRITICAL,
        message: `Memoria crítica: ${metrics.memoryUsage.toFixed(1)}%`,
      });
    } else if (metrics.memoryUsage >= this.thresholds.memoryWarning) {
      alerts.push({
        type: 'MEMORY_WARNING',
        severity: AlertSeverity.WARNING,
        message: `Memoria elevada: ${metrics.memoryUsage.toFixed(1)}%`,
      });
    }

    if (metrics.temperature && metrics.temperature >= this.thresholds.tempCritical) {
      alerts.push({
        type: 'TEMPERATURE_CRITICAL',
        severity: AlertSeverity.CRITICAL,
        message: `Temperatura crítica: ${metrics.temperature.toFixed(1)}°C`,
      });
    } else if (metrics.temperature && metrics.temperature >= this.thresholds.tempWarning) {
      alerts.push({
        type: 'TEMPERATURE_WARNING',
        severity: AlertSeverity.WARNING,
        message: `Temperatura elevada: ${metrics.temperature.toFixed(1)}°C`,
      });
    }

    if (metrics.printerStatus === 'error') {
      alerts.push({
        type: 'PRINTER_ERROR',
        severity: AlertSeverity.CRITICAL,
        message: 'Error en impresora térmica',
      });
    } else if (metrics.printerStatus === 'warning') {
      alerts.push({
        type: 'PRINTER_WARNING',
        severity: AlertSeverity.WARNING,
        message: 'Impresora con problemas',
      });
    }

    if (metrics.cashDrawerStatus === 'error') {
      alerts.push({
        type: 'CASH_DRAWER_ERROR',
        severity: AlertSeverity.CRITICAL,
        message: 'Error en cajón de dinero',
      });
    }

    if (metrics.ticketStock !== undefined) {
      if (metrics.ticketStock <= this.thresholds.ticketCritical) {
        alerts.push({
          type: 'TICKET_STOCK_CRITICAL',
          severity: AlertSeverity.CRITICAL,
          message: `Tickets agotados: ${metrics.ticketStock} remaining`,
        });
      } else if (metrics.ticketStock <= this.thresholds.ticketLowWarning) {
        alerts.push({
          type: 'TICKET_STOCK_LOW',
          severity: AlertSeverity.WARNING,
          message: `Tickets bajos: ${metrics.ticketStock} remaining`,
        });
      }
    }

    if (metrics.paperStock !== undefined) {
      if (metrics.paperStock <= this.thresholds.paperCritical) {
        alerts.push({
          type: 'PAPER_STOCK_CRITICAL',
          severity: AlertSeverity.CRITICAL,
          message: `Papel agotado: ${metrics.paperStock} remaining`,
        });
      } else if (metrics.paperStock <= this.thresholds.paperLowWarning) {
        alerts.push({
          type: 'PAPER_STOCK_LOW',
          severity: AlertSeverity.WARNING,
          message: `Papel bajo: ${metrics.paperStock} remaining`,
        });
      }
    }

    if (metrics.networkStatus === 'offline') {
      alerts.push({
        type: 'NETWORK_OFFLINE',
        severity: AlertSeverity.CRITICAL,
        message: 'Conexión de red perdida',
      });
    }

    return alerts;
  }

  async recordHealth(
    kioskId: string,
    metrics: KioskHealthMetrics
  ): Promise<{ health: any; alerts: any[] }> {
    const healthStatus = this.evaluateHealthStatus(metrics);
    const alertConfigs = this.checkForAlerts(metrics);

    const [health] = await this.prisma.$transaction([
      this.prisma.kioskHealth.create({
        data: {
          kioskId,
          cpuUsage: metrics.cpuUsage,
          memoryUsage: metrics.memoryUsage,
          temperature: metrics.temperature,
          batteryLevel: metrics.batteryLevel,
          batteryCharging: metrics.batteryCharging,
          networkStatus: metrics.networkStatus || 'online',
          printerStatus: metrics.printerStatus || 'ok',
          cashDrawerStatus: metrics.cashDrawerStatus || 'ok',
          ticketStock: metrics.ticketStock,
          paperStock: metrics.paperStock,
          healthStatus,
          metadata: metrics.metadata,
        },
      }),
    ]);

    const createdAlerts = [];
    for (const alertConfig of alertConfigs) {
      const [alert] = await this.prisma.$transaction([
        this.prisma.kioskAlert.create({
          data: {
            kioskId,
            alertType: alertConfig.type,
            severity: alertConfig.severity,
            message: alertConfig.message,
          },
        }),
      ]);
      createdAlerts.push(alert);
    }

    await this.prisma.kioskDevice.update({
      where: { id: kioskId },
      data: {
        lastSeen: new Date(),
        status: KioskStatus.ONLINE,
      },
    });

    return { health, alerts: createdAlerts };
  }

  async getKioskHealthHistory(
    kioskId: string,
    hours: number = 24
  ): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.prisma.kioskHealth.findMany({
      where: {
        kioskId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }

  async getKioskAlerts(
    kioskId: string,
    includeAcknowledged: boolean = false,
    limit: number = 50
  ): Promise<any[]> {
    return this.prisma.kioskAlert.findMany({
      where: {
        kioskId,
        ...(includeAcknowledged ? {} : { acknowledged: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<any> {
    return this.prisma.kioskAlert.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });
  }

  async getOfflineKiosks(minutesOffline: number = 5): Promise<any[]> {
    const cutoff = new Date(Date.now() - minutesOffline * 60 * 1000);

    return this.prisma.kioskDevice.findMany({
      where: {
        status: KioskStatus.ONLINE,
        lastSeen: { lt: cutoff },
      },
      include: {
        store: { select: { name: true } },
      },
    });
  }

  async checkOfflineKiosks(): Promise<any[]> {
    const FIVE_MINUTES = 5;
    const cutoff = new Date(Date.now() - FIVE_MINUTES * 60 * 1000);

    const offlineKiosks = await this.prisma.kioskDevice.findMany({
      where: {
        status: { not: KioskStatus.OFFLINE },
        lastSeen: { lt: cutoff },
      },
      include: {
        store: { select: { id: true, name: true } },
      },
    });

    const createdAlerts = [];

    for (const kiosk of offlineKiosks) {
      await this.prisma.kioskDevice.update({
        where: { id: kiosk.id },
        data: { status: KioskStatus.OFFLINE },
      });

      const [alert] = await this.prisma.$transaction([
        this.prisma.kioskAlert.create({
          data: {
            kioskId: kiosk.id,
            alertType: 'KIOSK_OFFLINE',
            severity: AlertSeverity.CRITICAL,
            message: `Kiosco "${kiosk.deviceName}" desconectado por más de ${FIVE_MINUTES} minutos`,
          },
        }),
      ]);

      createdAlerts.push({ ...alert, kiosk });
    }

    return createdAlerts;
  }

  async calculateUptime(
    kioskId: string,
    hours: number = 24
  ): Promise<{ uptimePercentage: number; totalMinutes: number; onlineMinutes: number }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const records = await this.prisma.kioskHealth.findMany({
      where: { kioskId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    if (records.length === 0) {
      return { uptimePercentage: 0, totalMinutes: hours * 60, onlineMinutes: 0 };
    }

    const totalMinutes = hours * 60;
    let onlineMinutes = 0;

    for (let i = 0; i < records.length - 1; i++) {
      const current = records[i];
      const next = records[i + 1];
      const intervalMinutes = (next.createdAt.getTime() - current.createdAt.getTime()) / 60000;

      if (current.healthStatus !== HealthStatus.CRITICAL) {
        onlineMinutes += intervalMinutes;
      }
    }

    const uptimePercentage = (onlineMinutes / totalMinutes) * 100;

    return { uptimePercentage, totalMinutes, onlineMinutes };
  }
}

export function createHealthService(prisma: PrismaClient): HealthService {
  return new HealthService(prisma);
}
