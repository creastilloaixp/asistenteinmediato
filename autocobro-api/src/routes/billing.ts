import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { PLAN_LIMITS, PlanLimits } from '../middleware/subscription.js';

interface PlanInfo {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  limits: {
    kiosks: number | string;
    products: number | string;
    transactions: number | string;
  };
  features: {
    name: string;
    included: boolean;
  }[];
  highlighted?: boolean;
  stripePriceId?: {
    monthly: string;
    yearly: string;
  };
}

const PLANS: PlanInfo[] = [
  {
    id: 'FREE',
    name: 'Gratis',
    description: 'Perfecto para comenzar y probar AutoCobro',
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'MXN',
    },
    limits: {
      kiosks: 1,
      products: 50,
      transactions: '100/mes',
    },
    features: [
      { name: '1 Kiosco', included: true },
      { name: '50 Productos', included: true },
      { name: '100 Transacciones/mes', included: true },
      { name: 'Reportes básicos', included: true },
      { name: 'Soporte por email', included: true },
      { name: 'Analíticas avanzadas', included: false },
      { name: 'Multi-usuario', included: false },
      { name: 'Acceso API', included: false },
      { name: 'Personalización de marca', included: false },
    ],
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'Para negocios en crecimiento',
    price: {
      monthly: 499,
      yearly: 4990,
      currency: 'MXN',
    },
    limits: {
      kiosks: 2,
      products: 200,
      transactions: '500/mes',
    },
    features: [
      { name: '2 Kioscos', included: true },
      { name: '200 Productos', included: true },
      { name: '500 Transacciones/mes', included: true },
      { name: 'Reportes básicos', included: true },
      { name: 'Analíticas', included: true },
      { name: 'Soporte por email', included: true },
      { name: 'Multi-usuario', included: false },
      { name: 'Acceso API', included: false },
      { name: 'Personalización de marca', included: false },
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    description: 'La mejor opción para empresas',
    price: {
      monthly: 1299,
      yearly: 12990,
      currency: 'MXN',
    },
    limits: {
      kiosks: 5,
      products: 1000,
      transactions: '2000/mes',
    },
    highlighted: true,
    features: [
      { name: '5 Kioscos', included: true },
      { name: '1000 Productos', included: true },
      { name: '2000 Transacciones/mes', included: true },
      { name: 'Reportes avanzados', included: true },
      { name: 'Analíticas completas', included: true },
      { name: 'Multi-usuario', included: true },
      { name: 'Acceso API', included: true },
      { name: 'Personalización de marca', included: true },
      { name: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Solución personalizada para grandes empresas',
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'MXN',
    },
    limits: {
      kiosks: 'Ilimitado',
      products: 'Ilimitado',
      transactions: 'Ilimitado',
    },
    features: [
      { name: 'Kioscos ilimitados', included: true },
      { name: 'Productos ilimitados', included: true },
      { name: 'Transacciones ilimitadas', included: true },
      { name: 'Reportes avanzados', included: true },
      { name: 'Analíticas completas', included: true },
      { name: 'Multi-usuario', included: true },
      { name: 'Acceso API completo', included: true },
      { name: 'Personalización completa', included: true },
      { name: 'Soporte prioritario 24/7', included: true },
    ],
  },
];

const router = Router();

router.get('/plans', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      plans: PLANS,
    },
  });
}));

router.get('/compare', asyncHandler(async (req, res) => {
  const comparison = PLANS.map(plan => ({
    id: plan.id,
    name: plan.name,
    monthlyPrice: plan.price.monthly,
    yearlyPrice: plan.price.yearly,
    kiosks: plan.limits.kiosks,
    products: plan.limits.products,
    transactions: plan.limits.transactions,
    features: plan.features.filter(f => f.included).map(f => f.name),
    highlighted: plan.highlighted || false,
  }));

  res.json({
    success: true,
    data: {
      plans: comparison,
    },
  });
}));

router.get('/my-plan', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token no proporcionado');
  }

  res.json({
    success: true,
    data: {
      plans: PLANS,
    },
  });
}));

export default router;
