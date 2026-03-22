import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

router.post('/register', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { email, password, name, storeId } = req.body;

  if (!email || !password || !name) {
    throw new HttpError('Email, password y name son requeridos', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError('El email ya está registrado', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      storeId,
      role: storeId ? UserRole.OWNER : UserRole.ADMIN,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      storeId: true,
    },
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, storeId: user.storeId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.status(201).json({
    success: true,
    data: { user, token },
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError('Email y password son requeridos', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { store: { select: { id: true, name: true, apiKey: true } } },
  });

  if (!user) {
    throw new HttpError('Credenciales inválidas', 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new HttpError('Credenciales inválidas', 401);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, storeId: user.storeId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        store: user.store,
      },
      token,
    },
  });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    throw new HttpError('Token es requerido', 400);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role, storeId: decoded.storeId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ success: true, data: { token: newToken } });
  } catch {
    throw new HttpError('Token inválido', 401);
  }
}));

router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError('Token no proporcionado', 401);
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        store: { select: { id: true, name: true, apiKey: true } },
      },
    });

    if (!user) {
      throw new HttpError('Usuario no encontrado', 404);
    }

    res.json({ success: true, data: { user } });
  } catch (error: any) {
    if (error.message === 'Usuario no encontrado') throw error;
    throw new HttpError('Token inválido', 401);
  }
}));

export default router;
