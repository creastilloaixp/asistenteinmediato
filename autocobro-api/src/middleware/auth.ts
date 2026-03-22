import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        storeId?: string;
      };
      prisma: PrismaClient;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token no proporcionado' }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      storeId: decoded.storeId
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Token inválido o expirado' }
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'No autenticado' }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'No tienes permisos para esta acción' }
      });
    }

    next();
  };
}

export function requireStore(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.storeId) {
    return res.status(403).json({
      success: false,
      error: { message: 'Debes pertenecer a una tienda' }
    });
  }
  next();
}
