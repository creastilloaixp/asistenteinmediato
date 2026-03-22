import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { createActivityLog } from '../services/activityLog.js';

const router = Router();

router.get('/', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { search, page = 1, limit = 50 } = req.query;
  const storeId = req.user!.storeId!;

  const where: any = {
    storeId,
    active: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
      { phone: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { lastVisit: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

router.get('/frequent', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { limit = 10 } = req.query;
  const storeId = req.user!.storeId!;

  const frequentCustomers = await prisma.customer.findMany({
    where: { storeId, active: true, visitCount: { gt: 0 } },
    orderBy: { visitCount: 'desc' },
    take: Number(limit),
  });

  res.json({
    success: true,
    data: { customers: frequentCustomers },
  });
}));

router.get('/top-spenders', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { limit = 10 } = req.query;
  const storeId = req.user!.storeId!;

  const topSpenders = await prisma.customer.findMany({
    where: { storeId, active: true, totalSpent: { gt: 0 } },
    orderBy: { totalSpent: 'desc' },
    take: Number(limit),
  });

  res.json({
    success: true,
    data: { customers: topSpenders },
  });
}));

router.get('/lookup', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { email, phone } = req.query;
  const storeId = req.user!.storeId!;

  if (!email && !phone) {
    throw new HttpError('Email o phone son requeridos', 400);
  }

  const where: any = { storeId, active: true };
  if (email) where.email = String(email);
  if (phone) where.phone = String(phone);

  const customer = await prisma.customer.findFirst({ where });

  if (!customer) {
    return res.json({
      success: true,
      data: { customer: null, message: 'Cliente no encontrado' },
    });
  }

  res.json({
    success: true,
    data: { customer },
  });
}));

router.get('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;

  const customer = await prisma.customer.findFirst({
    where: { id, storeId, active: true },
  });

  if (!customer) {
    throw new HttpError('Cliente no encontrado', 404);
  }

  res.json({
    success: true,
    data: { customer },
  });
}));

router.get('/:id/history', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const storeId = req.user!.storeId!;

  const customer = await prisma.customer.findFirst({
    where: { id, storeId, active: true },
  });

  if (!customer) {
    throw new HttpError('Cliente no encontrado', 404);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { customerId: id, storeId, status: 'COMPLETED' },
      include: {
        items: true,
        kiosk: { select: { deviceName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.transaction.count({
      where: { customerId: id, storeId, status: 'COMPLETED' },
    }),
  ]);

  const stats = await prisma.transaction.aggregate({
    where: { customerId: id, storeId, status: 'COMPLETED' },
    _sum: { total: true },
    _count: true,
  });

  res.json({
    success: true,
    data: {
      customer,
      transactions,
      stats: {
        totalSpent: Number(stats._sum.total || 0),
        transactionCount: stats._count,
        averageTicket: stats._count > 0 ? Number(stats._sum.total || 0) / stats._count : 0,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

router.post('/', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { email, phone, name, notes } = req.body;
  const storeId = req.user!.storeId!;

  if (!email && !phone) {
    throw new HttpError('Email o phone son requeridos', 400);
  }

  const existingWhere: any = { storeId, active: true };
  if (email) existingWhere.email = email;
  if (phone) existingWhere.phone = phone;

  const existing = await prisma.customer.findFirst({ where: existingWhere });
  if (existing) {
    throw new HttpError('Ya existe un cliente con ese email o teléfono', 409);
  }

  const customer = await prisma.customer.create({
    data: {
      storeId,
      email,
      phone,
      name,
      notes,
    },
  });

  await createActivityLog({
    storeId,
    type: 'USER_CREATED',
    action: `Cliente registrado: ${name || email || phone}`,
    entityType: 'Customer',
    entityId: customer.id,
    details: { email, phone },
  });

  res.status(201).json({
    success: true,
    data: { customer },
  });
}));

router.post('/register-at-purchase', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { email, phone, name, transactionId } = req.body;
  const storeId = req.user!.storeId!;

  if (!email && !phone) {
    throw new HttpError('Email o phone son requeridos', 400);
  }

  let customer = await prisma.customer.findFirst({
    where: { 
      storeId, 
      active: true,
      ...(email && { email }),
      ...(phone && { phone }),
    },
  });

  if (customer) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: name || customer.name,
        visitCount: { increment: 1 },
        lastVisit: new Date(),
      },
    });
  } else {
    customer = await prisma.customer.create({
      data: {
        storeId,
        email,
        phone,
        name,
        visitCount: 1,
        lastVisit: new Date(),
      },
    });
  }

  if (transactionId) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { customerId: customer.id },
    });
  }

  res.status(201).json({
    success: true,
    data: { customer },
  });
}));

router.put('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { email, phone, name, notes } = req.body;
  const storeId = req.user!.storeId!;

  const existing = await prisma.customer.findFirst({
    where: { id, storeId, active: true },
  });

  if (!existing) {
    throw new HttpError('Cliente no encontrado', 404);
  }

  if (email && email !== existing.email) {
    const duplicate = await prisma.customer.findFirst({
      where: { storeId, email, active: true, id: { not: id } },
    });
    if (duplicate) {
      throw new HttpError('Ya existe otro cliente con ese email', 409);
    }
  }

  if (phone && phone !== existing.phone) {
    const duplicate = await prisma.customer.findFirst({
      where: { storeId, phone, active: true, id: { not: id } },
    });
    if (duplicate) {
      throw new HttpError('Ya existe otro cliente con ese teléfono', 409);
    }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      email,
      phone,
      name,
      notes,
    },
  });

  await createActivityLog({
    storeId,
    type: 'USER_UPDATED',
    action: `Cliente actualizado: ${name || email || phone}`,
    entityType: 'Customer',
    entityId: customer.id,
  });

  res.json({
    success: true,
    data: { customer },
  });
}));

router.post('/:id/points', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { points, action } = req.body;
  const storeId = req.user!.storeId!;

  if (points === undefined || points <= 0) {
    throw new HttpError('Puntos deben ser mayores a 0', 400);
  }

  const customer = await prisma.customer.findFirst({
    where: { id, storeId, active: true },
  });

  if (!customer) {
    throw new HttpError('Cliente no encontrado', 404);
  }

  const newPoints = action === 'subtract' 
    ? Math.max(0, customer.loyaltyPoints - points)
    : customer.loyaltyPoints + points;

  const updated = await prisma.customer.update({
    where: { id },
    data: { loyaltyPoints: newPoints },
  });

  await createActivityLog({
    storeId,
    type: 'USER_UPDATED',
    action: `Puntos ${action === 'subtract' ? 'canjeados' : 'agregados'}: ${points} puntos`,
    entityType: 'Customer',
    entityId: customer.id,
    details: {
      previousPoints: customer.loyaltyPoints,
      newPoints,
      action,
    },
  });

  res.json({
    success: true,
    data: { customer: updated },
  });
}));

router.delete('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;

  const existing = await prisma.customer.findFirst({
    where: { id, storeId },
  });

  if (!existing) {
    throw new HttpError('Cliente no encontrado', 404);
  }

  await prisma.customer.update({
    where: { id },
    data: { active: false },
  });

  res.json({
    success: true,
    message: 'Cliente eliminado',
  });
}));

export default router;
