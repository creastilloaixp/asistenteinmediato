import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ActivityType = 
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED'
  | 'STORE_CREATED' | 'STORE_UPDATED'
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'PRODUCT_LOW_STOCK'
  | 'TRANSACTION_CREATED' | 'TRANSACTION_COMPLETED' | 'TRANSACTION_CANCELLED' | 'TRANSACTION_REFUNDED'
  | 'PAYMENT_RECEIVED'
  | 'KIOSK_REGISTERED' | 'KIOSK_ONLINE' | 'KIOSK_OFFLINE' | 'KIOSK_ALERT'
  | 'SETTINGS_CHANGED' | 'PLAN_CHANGED' | 'EXPORT_DATA';

interface LogOptions {
  storeId: string;
  userId?: string;
  userName?: string;
  type: ActivityType;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createActivityLog(options: LogOptions) {
  try {
    const log = await prisma.activityLog.create({
      data: {
        storeId: options.storeId,
        userId: options.userId,
        userName: options.userName,
        type: options.type,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        details: options.details,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      },
    });
    return log;
  } catch (error) {
    console.error('Failed to create activity log:', error);
  }
}

export async function getActivityLogs(storeId: string, options?: {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: any = { storeId };
  
  if (options?.type) {
    where.type = options.type;
  }
  
  if (options?.userId) {
    where.userId = options.userId;
  }
  
  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      where.createdAt.gte = options.dateFrom;
    }
    if (options.dateTo) {
      where.createdAt.lte = options.dateTo;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getActivityStats(storeId: string, days: number = 7) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const [logsByDay, logsByType, recentActivity] = await Promise.all([
    prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM activity_logs
      WHERE "storeId" = ${storeId}
        AND "createdAt" >= ${dateFrom}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `,
    prisma.activityLog.groupBy({
      by: ['type'],
      where: {
        storeId,
        createdAt: { gte: dateFrom },
      },
      _count: { type: true },
    }),
    prisma.activityLog.count({
      where: {
        storeId,
        createdAt: { gte: dateFrom },
      },
    }),
  ]);

  return {
    logsByDay,
    logsByType,
    totalActivities: recentActivity,
  };
}

export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    USER_LOGIN: '🔐',
    USER_LOGOUT: '🚪',
    USER_CREATED: '👤',
    USER_UPDATED: '✏️',
    USER_DELETED: '🗑️',
    STORE_CREATED: '🏪',
    STORE_UPDATED: '🏪',
    PRODUCT_CREATED: '📦',
    PRODUCT_UPDATED: '📝',
    PRODUCT_DELETED: '🗑️',
    PRODUCT_LOW_STOCK: '⚠️',
    TRANSACTION_CREATED: '🛒',
    TRANSACTION_COMPLETED: '✅',
    TRANSACTION_CANCELLED: '❌',
    TRANSACTION_REFUNDED: '💸',
    PAYMENT_RECEIVED: '💰',
    KIOSK_REGISTERED: '🖥️',
    KIOSK_ONLINE: '🟢',
    KIOSK_OFFLINE: '🔴',
    KIOSK_ALERT: '🚨',
    SETTINGS_CHANGED: '⚙️',
    PLAN_CHANGED: '📋',
    EXPORT_DATA: '📥',
  };
  return icons[type] || '📌';
}

export function getActivityColor(type: ActivityType): string {
  const colors: Record<ActivityType, string> = {
    USER_LOGIN: 'bg-blue-100 text-blue-700',
    USER_LOGOUT: 'bg-gray-100 text-gray-700',
    USER_CREATED: 'bg-green-100 text-green-700',
    USER_UPDATED: 'bg-yellow-100 text-yellow-700',
    USER_DELETED: 'bg-red-100 text-red-700',
    STORE_CREATED: 'bg-purple-100 text-purple-700',
    STORE_UPDATED: 'bg-purple-100 text-purple-700',
    PRODUCT_CREATED: 'bg-green-100 text-green-700',
    PRODUCT_UPDATED: 'bg-yellow-100 text-yellow-700',
    PRODUCT_DELETED: 'bg-red-100 text-red-700',
    PRODUCT_LOW_STOCK: 'bg-orange-100 text-orange-700',
    TRANSACTION_CREATED: 'bg-blue-100 text-blue-700',
    TRANSACTION_COMPLETED: 'bg-green-100 text-green-700',
    TRANSACTION_CANCELLED: 'bg-red-100 text-red-700',
    TRANSACTION_REFUNDED: 'bg-purple-100 text-purple-700',
    PAYMENT_RECEIVED: 'bg-green-100 text-green-700',
    KIOSK_REGISTERED: 'bg-blue-100 text-blue-700',
    KIOSK_ONLINE: 'bg-green-100 text-green-700',
    KIOSK_OFFLINE: 'bg-red-100 text-red-700',
    KIOSK_ALERT: 'bg-orange-100 text-orange-700',
    SETTINGS_CHANGED: 'bg-gray-100 text-gray-700',
    PLAN_CHANGED: 'bg-purple-100 text-purple-700',
    EXPORT_DATA: 'bg-blue-100 text-blue-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}
