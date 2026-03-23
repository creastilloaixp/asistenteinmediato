/**
 * Mercado Pago Service
 * 
 * Configuración para pagos con QR de Mercado Pago en kioscos
 * 
 * API Reference: https://www.mercadopago.com.mx/developers/es/reference
 * 
 * PASOS PARA CONFIGURAR:
 * 1. Crear cuenta en https://www.mercadopago.com.mx
 * 2. Ir a Dev Tools > Tus integraciones > Credenciales
 * 3. Obtener Access Token (Production o Test según ambiente)
 * 4. Para producción, necesitas dominio HTTPS
 */

import { v4 as uuidv4 } from 'uuid';

const MERCADOPAGO_API_URL = 'https://api.mercadopago.com';

export interface MercadoPagoQRPayment {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  qrCode?: string;
  qrCodeBase64?: string;
  externalReference: string;
  inStoreOrderId?: string;
}

export interface MercadoPagoPaymentResult {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  externalReference: string;
  transactionAmount: number;
  paymentMethodId: string;
  dateCreated: string;
  dateApproved?: string;
}

interface CreateQROptions {
  amount: number;
  description: string;
  externalReference: string;
  notificationUrl?: string;
}

interface CreateOrderOptions {
  amount: number;
  description: string;
  externalReference: string;
  posId: string;
  userId?: string;
}

interface MercadoPagoOrderResponse {
  id: string;
  status: string;
  external_reference: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_number?: string;
    };
  };
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  external_reference: string;
  transaction_amount: number;
  payment_method_id: string;
  date_created: string;
  date_approved?: string;
}

/**
 * Obtiene Access Token de las variables de entorno
 */
function getAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
  }
  return token;
}

/**
 * Crea una orden QR para pagos en tienda (Point)
 * POST /instore/qr/seller/collectors/{user_id}/pos/{pos_id}/orders
 * 
 * Esta es la forma recomendada para kioscos con QR físico
 */
export async function createInStoreQROrder(options: CreateOrderOptions): Promise<MercadoPagoQRPayment> {
  const accessToken = getAccessToken();
  const { amount, description, externalReference, posId, userId = '0' } = options;

  const body = {
    transaction_amount: Number(amount),
    description: description || 'Pago AutoCobro',
    external_reference: externalReference,
    items: [
      {
        sku_number: externalReference,
        category_descriptor: {
          merchant_flexible_field_1: 'AUTOCOBRO_KIOSK',
        },
        description: description,
        quantity: 1,
        unit_price: Number(amount),
      },
    ],
  };

  const response = await fetch(
    `${MERCADOPAGO_API_URL}/instore/qr/seller/collectors/${userId}/pos/${posId}/orders`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json() as { message?: string; error?: string };
    throw new Error(`Mercado Pago error: ${error.message || error.error || 'Unknown error'}`);
  }

  const data = await response.json() as MercadoPagoOrderResponse;

  return {
    id: data.id,
    status: data.status === 'pending' ? 'pending' : 'approved',
    qrCode: data.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
    externalReference: data.external_reference,
    inStoreOrderId: data.id,
  };
}

/**
 * Crea un pago con OXXO (México) - Voucher físico
 * POST /v1/payments
 * 
 * Genera un voucher que el cliente puede pagar en tiendas OXXO
 * Vencimiento: 3 días (configurable hasta 30 días máximo)
 */
export async function createOXXOPayment(options: CreateQROptions & { email?: string }): Promise<MercadoPagoQRPayment> {
  const accessToken = getAccessToken();
  const { amount, description, externalReference, notificationUrl, email } = options;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 3); // 3 días de vigencia

  const body = {
    transaction_amount: Number(amount),
    description: description || 'Pago AutoCobro',
    payment_method_id: 'oxxo',
    external_reference: externalReference,
    notification_url: notificationUrl,
    payer: {
      email: email || 'cliente@ejemplo.com',
    },
    date_of_expiration: expirationDate.toISOString(),
  };

  const idempotencyKey = `oxxo-${externalReference}-${Date.now()}`;
  
  console.log(`[MercadoPago] Creando pago OXXO para: ${externalReference}`);
  
  const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json() as any;

  if (!response.ok) {
    console.error('[MercadoPago] Error en API:', JSON.stringify(data, null, 2));
    throw new Error(`Mercado Pago error: ${data.message || data.cause?.[0]?.description || 'Unknown error'}`);
  }

  // LOG de depuración para Producción (ayuda a ver dónde viene el código)
  console.log('[MercadoPago] Pago Creado con Éxito. Respuesta:', JSON.stringify({
    id: data.id,
    status: data.status,
    barcode: data.barcode,
    details: data.transaction_details,
    poi: data.point_of_interaction ? 'presente' : 'ausente'
  }, null, 2));

  // Búsqueda profunda del código (OXXO Pay usa varias rutas según el servidor)
  const code = 
    data.barcode?.content || 
    data.transaction_details?.payment_reference || 
    data.point_of_interaction?.transaction_data?.barcode?.content ||
    data.point_of_interaction?.transaction_data?.payment_reference;

  return {
    id: data.id.toString(),
    status: data.status as 'pending' | 'approved',
    qrCode: code, 
    qrCodeBase64: data.transaction_details?.payment_reference || code,
    externalReference: data.external_reference,
  };
}

/**
 * Alias para compatibilidad
 */
export async function createQRPayment(options: CreateQROptions): Promise<MercadoPagoQRPayment> {
  return createOXXOPayment(options);
}

/**
 * Obtiene el estado de un pago desde Mercado Pago
 */
export async function getPaymentStatus(paymentId: string): Promise<MercadoPagoPaymentResult | null> {
  const accessToken = getAccessToken();

  const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as MercadoPagoPaymentResponse;

  return {
    id: data.id.toString(),
    status: data.status,
    externalReference: data.external_reference,
    transactionAmount: data.transaction_amount,
    paymentMethodId: data.payment_method_id,
    dateCreated: data.date_created,
    dateApproved: data.date_approved,
  };
}

/**
 * Genera un ID de referencia único para la transacción
 */
export function generateExternalReference(): string {
  return `AUTO-${uuidv4().slice(0, 8).toUpperCase()}`;
}

/**
 * Verifica si Mercado Pago está configurado y disponible
 */
export function isMercadoPagoConfigured(): boolean {
  return !!(
    process.env.MERCADOPAGO_ACCESS_TOKEN &&
    process.env.MERCADOPAGO_ACCESS_TOKEN !== 'your_mercadopago_access_token'
  );
}
