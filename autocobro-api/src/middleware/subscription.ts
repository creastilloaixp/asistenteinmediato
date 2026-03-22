import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Plan, SubscriptionStatus } from '@prisma/client';

export interface PlanLimits {
  maxKiosks: number;
  maxProducts: number;
  monthlyTransactions: number;
  features: {
    analytics: boolean;
    multiUser: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    advancedReporting: boolean;
  };
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    maxKiosks: 1,
    maxProducts: 50,
    monthlyTransactions: 100,
    features: {
      analytics: false,
      multiUser: false,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      advancedReporting: false,
    },
  },
  [Plan.STARTER]: {
    maxKiosks: 2,
    maxProducts: 200,
    monthlyTransactions: 500,
    features: {
      analytics: true,
      multiUser: false,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
      advancedReporting: false,
    },
  },
  [Plan.PRO]: {
    maxKiosks: 5,
    maxProducts: 1000,
    monthlyTransactions: 2000,
    features: {
      analytics: true,
      multiUser: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: false,
      advancedReporting: true,
    },
  },
  [Plan.ENTERPRISE]: {
    maxKiosks: -1,
    maxProducts: -1,
    monthlyTransactions: -1,
    features: {
      analytics: true,
      multiUser: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
      advancedReporting: true,
    },
  },
};

declare global {
  namespace Express {
    interface Request {
      subscription?: {
        plan: Plan;
        status: SubscriptionStatus;
        expiresAt: Date;
        currentPeriodEnd: Date;
      };
      planLimits?: PlanLimits;
      storeUsage?: {
        kioskCount: number;
        productCount: number;
        monthlyTransactionCount: number;
      };
    }
  }
}

export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const prisma = req.prisma as PrismaClient;
  const storeId = req.user?.storeId;

  if (!storeId) {
    return res.status(403).json({
      success: false,
      error: { message: 'Debes pertenecer a una tienda' },
      code: 'NO_STORE',
    });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      subscription: true,
      _count: {
        select: { kiosks: true, products: true },
      },
    },
  });

  if (!store) {
    return res.status(404).json({
      success: false,
      error: { message: 'Tienda no encontrada' },
      code: 'STORE_NOT_FOUND',
    });
  }

  if (!store.active) {
    return res.status(403).json({
      success: false,
      error: { message: 'Tienda desactivada' },
      code: 'STORE_DISABLED',
    });
  }

  const now = new Date();
  const subscription = store.subscription;

  if (!subscription) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'No tienes una suscripción activa',
        upgradeRequired: true,
        currentPlan: store.plan,
      },
      code: 'NO_SUBSCRIPTION',
    });
  }

  const isExpired = subscription.currentPeriodEnd < now;
  const isCancelled = subscription.status === SubscriptionStatus.CANCELLED;
  const isPastDue = subscription.status === SubscriptionStatus.PAST_DUE;

  if (isCancelled && subscription.currentPeriodEnd < now) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Tu suscripción ha expirado',
        upgradeRequired: true,
        currentPlan: subscription.plan,
      },
      code: 'SUBSCRIPTION_EXPIRED',
    });
  }

  if (isPastDue) {
    return res.status(403).json({
      success: false,
      error: { 
        message: 'Tu suscripción tiene un pago pendiente',
        upgradeRequired: true,
        currentPlan: subscription.plan,
      },
      code: 'SUBSCRIPTION_PAST_DUE',
    });
  }

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTransactions = await prisma.transaction.count({
    where: {
      storeId,
      status: 'COMPLETED',
      createdAt: { gte: currentMonthStart },
    },
  });

  req.subscription = {
    plan: subscription.plan,
    status: subscription.status,
    expiresAt: subscription.currentPeriodEnd,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };

  req.planLimits = PLAN_LIMITS[subscription.plan];
  req.storeUsage = {
    kioskCount: store._count.kiosks,
    productCount: store._count.products,
    monthlyTransactionCount: monthlyTransactions,
  };

  next();
}

export function checkLimit(limitType: 'kiosks' | 'products' | 'transactions') {
  return (req: Request, res: Response, next: NextFunction) => {
    const limits = req.planLimits;
    const usage = req.storeUsage;

    if (!limits || !usage) {
      return res.status(500).json({
        success: false,
        error: { message: 'Error interno: límites no verificados' },
        code: 'INTERNAL_ERROR',
      });
    }

    let limit = limits[`max${limitType.charAt(0).toUpperCase() + limitType.slice(1)}` as keyof PlanLimits] as number;
    let current = usage[`${limitType}Count` as keyof typeof usage];

    if (limitType === 'transactions') {
      current = usage.monthlyTransactionCount;
    }

    if (limit !== -1 && current >= limit) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Has alcanzado el límite de ${limitType}`,
          limit,
          current,
          upgradeRequired: true,
        },
        code: 'LIMIT_EXCEEDED',
      });
    }

    next();
  };
}
