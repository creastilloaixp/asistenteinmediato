import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { createActivityLog } from '../services/activityLog.js';
import { wsService } from '../services/websocket.js';

const router = Router();

router.get('/', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { search, category, page = 1, limit = 50 } = req.query;
  const storeId = req.user!.storeId!;

  const where: Prisma.ProductWhereInput = {
    storeId,
    active: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { barcode: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = String(category);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

router.get('/barcode/:barcode', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { barcode } = req.params;
  const storeId = req.user?.storeId;

  if (!barcode) {
    throw new HttpError('Barcode es requerido', 400);
  }

  const where: Prisma.ProductWhereInput = {
    barcode,
    active: true,
  };

  if (storeId) {
    where.storeId = storeId;
  }

  const product = await prisma.product.findFirst({ where });

  if (!product) {
    throw new HttpError('Producto no encontrado', 404);
  }

  res.json({ success: true, data: { product } });
}));

router.get('/top-selling', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { limit = 10 } = req.query;
  const storeId = req.user!.storeId!;

  const topProducts = await prisma.transactionItem.groupBy({
    by: ['productId', 'productName'],
    where: {
      transaction: {
        storeId,
        status: 'COMPLETED',
      },
    },
    _sum: {
      quantity: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: Number(limit),
  });

  res.json({
    success: true,
    data: {
      topProducts: topProducts.map(p => ({
        productId: p.productId,
        productName: p.productName,
        totalQuantity: p._sum.quantity || 0,
        totalSales: p._sum.subtotal || 0,
      })),
    },
  });
}));

router.get('/low-stock', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;

  const lowStockProducts = await prisma.$queryRaw<any[]>`
    SELECT * FROM products 
    WHERE "storeId" = ${storeId} 
    AND active = true 
    AND stock <= "lowStockThreshold"
    ORDER BY stock ASC
  `;

  res.json({
    success: true,
    data: { products: lowStockProducts },
  });
}));

router.get('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;

  const product = await prisma.product.findFirst({
    where: { id, storeId, active: true },
  });

  if (!product) {
    throw new HttpError('Producto no encontrado', 404);
  }

  res.json({ success: true, data: { product } });
}));

router.post('/', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { barcode, name, price, image, stock, category } = req.body;
  const storeId = req.user!.storeId!;

  if (!name || price === undefined) {
    throw new HttpError('Name y price son requeridos', 400);
  }

  const product = await prisma.product.create({
    data: {
      storeId,
      barcode,
      name,
      price: Number(price),
      image,
      stock: stock || 0,
      category,
    },
  });

  res.status(201).json({ success: true, data: { product } });
}));

router.put('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;
  const { barcode, name, price, image, stock, category, active } = req.body;

  const existing = await prisma.product.findFirst({
    where: { id, storeId },
  });

  if (!existing) {
    throw new HttpError('Producto no encontrado', 404);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      barcode,
      name,
      price: price !== undefined ? Number(price) : undefined,
      image,
      stock: stock !== undefined ? stock : undefined,
      category,
      active: active !== undefined ? active : undefined,
    },
  });

  res.json({ success: true, data: { product } });
}));

router.delete('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;

  const existing = await prisma.product.findFirst({
    where: { id, storeId },
  });

  if (!existing) {
    throw new HttpError('Producto no encontrado', 404);
  }

  await prisma.product.update({
    where: { id },
    data: { active: false },
  });

  res.json({ success: true, message: 'Producto eliminado' });
}));


router.post('/import', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { products } = req.body;
  const storeId = req.user!.storeId!;

  if (!Array.isArray(products)) {
    throw new HttpError('Products debe ser un array', 400);
  }

  const results = await Promise.allSettled(
    products.map((p: any) =>
      prisma.product.create({
        data: {
          storeId,
          barcode: p.barcode,
          name: p.name,
          price: Number(p.price),
          image: p.image,
          stock: p.stock || 0,
          category: p.category,
        },
      })
    )
  );

  const created = results.filter(r => r.status === 'fulfilled').length;
  const errors = results.filter(r => r.status === 'rejected').length;

  res.status(201).json({
    success: true,
    data: { created, errors, total: products.length },
  });
}));


router.post('/:id/restock', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { quantity, threshold } = req.body;
  const storeId = req.user!.storeId!;

  if (quantity === undefined || quantity <= 0) {
    throw new HttpError('Cantidad debe ser mayor a 0', 400);
  }

  const product = await prisma.product.findFirst({
    where: { id, storeId, active: true },
  });

  if (!product) {
    throw new HttpError('Producto no encontrado', 404);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      stock: { increment: quantity },
      ...(threshold !== undefined && { lowStockThreshold: threshold }),
    },
  });

  await createActivityLog({
    storeId,
    type: 'PRODUCT_UPDATED',
    action: `Reabastecido ${product.name}: +${quantity} unidades (Stock: ${updated.stock})`,
    entityType: 'Product',
    entityId: product.id,
    details: {
      productName: product.name,
      addedQuantity: quantity,
      newStock: updated.stock,
      previousStock: product.stock,
    },
  });

  res.json({
    success: true,
    data: { product: updated },
  });
}));

router.put('/:id/stock-threshold', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { threshold } = req.body;
  const storeId = req.user!.storeId!;

  if (threshold === undefined || threshold < 0) {
    throw new HttpError('Threshold debe ser 0 o mayor', 400);
  }

  const product = await prisma.product.findFirst({
    where: { id, storeId, active: true },
  });

  if (!product) {
    throw new HttpError('Producto no encontrado', 404);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { lowStockThreshold: threshold },
  });

  await createActivityLog({
    storeId,
    type: 'PRODUCT_UPDATED',
    action: `Actualizado umbral stock bajo de ${product.name}: ${threshold}`,
    entityType: 'Product',
    entityId: product.id,
    details: {
      productName: product.name,
      previousThreshold: product.lowStockThreshold,
      newThreshold: threshold,
    },
  });

  res.json({
    success: true,
    data: { product: updated },
  });
}));

export default router;
