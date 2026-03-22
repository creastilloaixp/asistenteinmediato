import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { page = 1, limit = 20 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { products: true, kiosks: true, transactions: true },
        },
      },
    }),
    prisma.store.count(),
  ]);

  res.json({
    success: true,
    data: {
      stores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      products: { where: { active: true }, take: 10 },
      kiosks: true,
      users: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!store) {
    throw new HttpError('Tienda no encontrada', 404);
  }

  res.json({ success: true, data: { store } });
}));

router.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { name, address, phone } = req.body;

  if (!name) {
    throw new HttpError('Name es requerido', 400);
  }

  const store = await prisma.store.create({
    data: { name, address, phone },
  });

  res.status(201).json({ success: true, data: { store } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { name, address, phone, active } = req.body;

  const existing = await prisma.store.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError('Tienda no encontrada', 404);
  }

  const store = await prisma.store.update({
    where: { id },
    data: { name, address, phone, active },
  });

  res.json({ success: true, data: { store } });
}));

router.post('/:id/sync', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { kioskId } = req.body;

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      products: { where: { active: true } },
    },
  });

  if (!store) {
    throw new HttpError('Tienda no encontrada', 404);
  }

  if (kioskId) {
    await prisma.kioskDevice.update({
      where: { id: kioskId },
      data: { lastSeen: new Date() },
    });
  }

  res.json({
    success: true,
    data: {
      products: store.products,
      storeName: store.name,
      syncTime: new Date().toISOString(),
    },
  });
}));

router.delete('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;

  const existing = await prisma.store.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError('Tienda no encontrada', 404);
  }

  await prisma.store.update({
    where: { id },
    data: { active: false },
  });

  res.json({ success: true, message: 'Tienda desactivada' });
}));

export default router;
