import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { generateRecommendations, generateChatResponse, type ChatMessage } from '../services/geminiService.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/recommendations', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { cartProducts } = req.body;

  if (!Array.isArray(cartProducts) || cartProducts.length === 0) {
    throw new HttpError('Se requiere un array de productos en el carrito', 400);
  }

  const storeId = req.user?.storeId;
  
  if (!storeId) {
    throw new HttpError('Store ID no encontrado', 400);
  }

  const availableProducts = await prisma.product.findMany({
    where: { storeId, active: true },
    select: { id: true, name: true, price: true, category: true }
  });

  if (availableProducts.length === 0) {
    return res.json({
      success: true,
      data: { recommendations: [], message: 'No hay productos disponibles' }
    });
  }

  try {
    const recommendations = await generateRecommendations(
      cartProducts.map((p: any) => ({
        id: p.productId,
        name: p.productName || p.name,
        price: Number(p.price),
        category: p.category
      })),
      availableProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.category || undefined
      }))
    );

    res.json({
      success: true,
      data: { recommendations }
    });
  } catch (error) {
    logger.geminiError('Error generating AI recommendations via admin endpoint', error, {
      endpoint: 'POST /ai/recommendations',
      storeId,
      cartProductsCount: cartProducts?.length || 0,
    });
    res.json({
      success: true,
      data: { recommendations: [], message: 'Error generando recomendaciones' }
    });
  }
}));

router.post('/chat', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError('Se requiere un array de mensajes', 400);
  }

  const lastMessages: ChatMessage[] = messages.slice(-10);

  const [stats, products] = await Promise.all([
    prisma.transaction.aggregate({
      where: { storeId, status: 'COMPLETED' },
      _sum: { total: true },
      _count: true
    }),
    prisma.product.findMany({
      where: { storeId, active: true },
      select: { id: true, name: true, price: true, category: true },
      take: 50
    })
  ]);

  const storeStats = {
    totalSales: Number(stats._sum.total || 0),
    totalTransactions: stats._count,
    averageTicket: stats._count > 0 ? Number(stats._sum.total || 0) / stats._count : 0,
    topProducts: [] as { name: string; quantity: number; sales: number }[]
  };

  const topProducts = await prisma.transactionItem.groupBy({
    by: ['productName'],
    where: { transaction: { storeId, status: 'COMPLETED' } },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5
  });

  storeStats.topProducts = topProducts.map(p => ({
    name: p.productName,
    quantity: Number(p._sum.quantity || 0),
    sales: Number(p._sum.subtotal || 0)
  }));

  const response = await generateChatResponse(
    lastMessages,
    storeStats,
    products.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category || undefined
    }))
  );

  res.json({
    success: true,
    data: { response }
  });
}));

router.get('/insights', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [dailyStats, weeklyStats, topProducts, lowStock] = await Promise.all([
    prisma.transaction.aggregate({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: startOfDay } },
      _sum: { total: true },
      _count: true
    }),
    prisma.transaction.aggregate({
      where: { storeId, status: 'COMPLETED', createdAt: { gte: startOfWeek } },
      _sum: { total: true },
      _count: true
    }),
    prisma.transactionItem.groupBy({
      by: ['productId', 'productName'],
      where: { transaction: { storeId, status: 'COMPLETED', createdAt: { gte: startOfWeek } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }),
    prisma.product.findMany({
      where: { storeId, active: true, stock: { lte: 5 } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: 'asc' },
      take: 5
    })
  ]);

  const weeklyGrowth = weeklyStats._count > 0 
    ? ((dailyStats._count / 7) / (weeklyStats._count / 7) - 1) * 100 
    : 0;

  const insights = [
    {
      type: 'sales',
      title: 'Ventas del día',
      value: Number(dailyStats._sum.total || 0),
      format: 'currency',
      trend: weeklyGrowth > 0 ? 'up' : 'down'
    },
    {
      type: 'transactions',
      title: 'Transacciones hoy',
      value: dailyStats._count,
      format: 'number',
      trend: weeklyGrowth > 0 ? 'up' : 'down'
    },
    {
      type: 'average',
      title: 'Ticket promedio',
      value: dailyStats._count > 0 ? Number(dailyStats._sum.total || 0) / dailyStats._count : 0,
      format: 'currency'
    }
  ];

  const recommendations = [
    ...topProducts.filter((p: any) => Number(p._sum.quantity || 0) > 10).map((p: any) => ({
      type: 'promotion',
      message: `Promociona "${p.productName}" - vendido ${p._sum.quantity} veces esta semana`
    })),
    ...lowStock.map(p => ({
      type: 'inventory',
      message: `Reordena "${p.name}" - solo ${p.stock} unidades en stock`
    }))
  ];

  res.json({
    success: true,
    data: {
      insights,
      topProducts: topProducts.map((p: any) => ({
        name: p.productName,
        quantity: Number(p._sum.quantity || 0),
        sales: Number(p._sum.subtotal || 0)
      })),
      lowStock: lowStock.map(p => ({ name: p.name, stock: p.stock })),
      recommendations: recommendations.slice(0, 3)
    }
  });
}));

export default router;