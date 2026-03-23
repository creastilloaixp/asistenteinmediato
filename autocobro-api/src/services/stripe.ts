/**
 * Stripe Service
 * 
 * Configuración real para pagos con tarjeta y Wallets vía Stripe
 * 
 * PASOS PARA CONFIGURAR:
 * 1. Crear cuenta en https://dashboard.stripe.com
 * 2. Ir a Developers > API keys
 * 3. Copiar Secret Key (pk_live_... o pk_test_...)
 * 4. Configurar Webhook en Developers > Webhooks
 * 
 * Endpoints de webhook necesarios:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 * 
 * Comandos Stripe CLI para testing:
 * stripe listen --forward-to localhost:4000/api/payments/stripe/webhook
 */

import Stripe from 'stripe';
import https from 'https';

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY no está configurado');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      httpAgent: new https.Agent({ family: 4 }), // Force IPv4 exclusively for Stripe SDK outbound traffic
    });
  }

  return stripeClient;
}

export interface CreatePaymentIntentOptions {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  automaticPaymentMethods?: boolean;
  paymentMethodTypes?: string[];
  description?: string;
  receiptEmail?: string;
  returnUrl?: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Crea un PaymentIntent en Stripe
 * Retorna el clientSecret para usar con Stripe.js en el frontend
 */
export async function createPaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntentResult> {
  const stripe = getStripeClient();
  
  const {
    amount,
    currency = 'mxn',
    metadata = {},
    automaticPaymentMethods = true,
    paymentMethodTypes = ['card', 'wallet'],
    description = 'Pago AutoCobro',
    receiptEmail,
    customerId,
  } = options;

  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: toStripeAmount(amount, currency),
    currency: currency.toLowerCase(),
    description,
    metadata,
    automatic_payment_methods: automaticPaymentMethods ? { enabled: true } : undefined,
    payment_method_types: automaticPaymentMethods ? undefined : paymentMethodTypes,
    ...(receiptEmail && { receipt_email: receiptEmail }),
    ...(customerId && { customer: customerId }),
  };

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
  };
}

/**
 * Confirma un PaymentIntent manualmente
 * Útil si necesitas más control sobre el flujo
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId?: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  
  const params: Stripe.PaymentIntentConfirmParams = {
    ...(paymentMethodId && { payment_method: paymentMethodId }),
  };

  return await stripe.paymentIntents.confirm(paymentIntentId, params);
}

/**
 * Cancela un PaymentIntent pendiente
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return await stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Obtiene el estado actual de un PaymentIntent
 */
export async function getPaymentIntentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
  try {
    const stripe = getStripeClient();
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    return null;
  }
}

/**
 * Procesa un webhook de Stripe de manera segura
 * Retorna el evento verificado o null si la verificación falla
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event | null> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET no está configurado');
  }

  try {
    return await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
}

/**
 * Crea un cliente de Stripe (para guardar métodos de pago)
 */
export async function createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
  const stripe = getStripeClient();
  
  return await stripe.customers.create({
    email,
    name,
  });
}

/**
 * Genera un link de pago para enviar por email o SMS
 */
export async function createPaymentLink(
  amount: number,
  currency: string,
  metadata: Record<string, string>
): Promise<string> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: 'Pago AutoCobro',
            metadata,
          },
          unit_amount: toStripeAmount(amount, currency),
        },
        quantity: 1,
      },
    ],
    metadata,
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
  });

  return session.url!;
}

/**
 * Procesa reembolso total o parcial
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.Refund> {
  const stripe = getStripeClient();

  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    ...(amount && { amount: toStripeAmount(amount, 'mxn') }),
  };

  return await stripe.refunds.create(refundParams);
}

/**
 * Verifica si Stripe está configurado y disponible
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_SECRET_KEY !== 'your_stripe_secret_key'
  );
}

/**
 * Convierte monto a formato de Stripe (centavos)
 * Stripe usa centavos en la mayoría de monedas
 */
export function toStripeAmount(amount: number, currency: string): number {
  // Monedas que usan decimales vs las que no
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'GNF', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
  
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }
  
  return Math.round(amount * 100);
}

/**
 * Convierte monto de Stripe (centavos) a formato normal
 */
export function fromStripeAmount(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'GNF', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
  
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }
  
  return amount / 100;
}
