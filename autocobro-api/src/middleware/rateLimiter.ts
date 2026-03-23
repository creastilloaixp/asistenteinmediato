/**
 * Rate limiting middleware presets for AutoCobro API.
 * Uses express-rate-limit to protect public endpoints from abuse.
 */

import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter: 15 requests per 15 minutes per IP address.
 * Protects the authentication endpoint from brute force attacks.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Kiosk endpoint rate limiter: 30 requests per minute per device key.
 * Protects kiosk sync and recommendation endpoints from excessive calls.
 */
export const kioskLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each device to 30 requests per minute
  message: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use device key from header instead of IP
    return (req.headers['x-device-key'] as string) || req.ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting in development mode
    return process.env.NODE_ENV === 'development';
  },
});

/**
 * Public endpoints rate limiter: 100 requests per minute per IP.
 * Generic limiter for publicly accessible endpoints.
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  },
});
