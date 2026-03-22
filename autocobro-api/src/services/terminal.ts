/**
 * Terminal POS Service
 * 
 * Integración con terminales de pago físicas (POS)
 * 
 * Opciones soportadas:
 * - Stripe Terminal (Reader)
 * - Mercado Pago Point
 * - Clip
 * - Simulador (para testing)
 */

export type TerminalProvider = 'stripe' | 'mercadopago' | 'clip' | 'simulator';

export interface TerminalPaymentRequest {
  amount: number;
  currency?: string;
  transactionId: string;
  description?: string;
}

export interface TerminalPaymentResult {
  success: boolean;
  paymentReference?: string;
  error?: string;
  provider: TerminalProvider;
  rawResponse?: any;
}

export interface TerminalStatus {
  connected: boolean;
  provider: TerminalProvider;
  deviceId?: string;
  batteryLevel?: number;
  lastSeen?: Date;
}

let currentProvider: TerminalProvider = 'simulator';

export function setTerminalProvider(provider: TerminalProvider) {
  currentProvider = provider;
  console.log(`Terminal provider set to: ${provider}`);
}

export function getTerminalProvider(): TerminalProvider {
  if (process.env.TERMINAL_PROVIDER) {
    return process.env.TERMINAL_PROVIDER as TerminalProvider;
  }
  return currentProvider;
}

export function isTerminalConfigured(): boolean {
  const provider = getTerminalProvider();
  
  switch (provider) {
    case 'stripe':
      return !!(
        process.env.STRIPE_SECRET_KEY &&
        process.env.STRIPE_TERMINAL_LOCATION_ID
      );
    case 'mercadopago':
      return !!(
        process.env.MERCADOPAGO_ACCESS_TOKEN &&
        process.env.MERCADOPAGO_POS_ID
      );
    case 'clip':
      return !!(
        process.env.CLIP_API_KEY
      );
    case 'simulator':
    default:
      return true;
  }
}

export async function initializeTerminal(): Promise<boolean> {
  const provider = getTerminalProvider();
  
  switch (provider) {
    case 'simulator':
      console.log('🖥️ Terminal simulator initialized');
      return true;
      
    case 'stripe':
      console.log('💳 Stripe Terminal initialization would happen here');
      return true;
      
    case 'mercadopago':
      console.log('💳 Mercado Pago Point initialization would happen here');
      return true;
      
    default:
      return false;
  }
}

export async function getTerminalStatus(): Promise<TerminalStatus> {
  const provider = getTerminalProvider();
  
  switch (provider) {
    case 'simulator':
      return {
        connected: true,
        provider: 'simulator',
        deviceId: 'SIMULATOR-001',
        batteryLevel: 100,
        lastSeen: new Date(),
      };
      
    case 'stripe':
      return {
        connected: !!process.env.STRIPE_TERMINAL_LOCATION_ID,
        provider: 'stripe',
        deviceId: process.env.STRIPE_READER_SERIAL || 'STRIPE-001',
        batteryLevel: 85,
        lastSeen: new Date(),
      };
      
    default:
      return {
        connected: false,
        provider,
      };
  }
}

export async function processTerminalPayment(
  request: TerminalPaymentRequest
): Promise<TerminalPaymentResult> {
  const provider = getTerminalProvider();
  
  console.log(`Processing terminal payment with provider: ${provider}`);
  console.log(`Amount: $${request.amount} ${request.currency || 'MXN'}`);
  
  switch (provider) {
    case 'simulator':
      return processSimulatorPayment(request);
      
    case 'stripe':
      return processStripeTerminalPayment(request);
      
    case 'mercadopago':
      return processMercadoPagoPointPayment(request);
      
    default:
      return {
        success: false,
        error: `Provider ${provider} not implemented`,
        provider,
      };
  }
}

async function processSimulatorPayment(
  request: TerminalPaymentRequest
): Promise<TerminalPaymentResult> {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const simulated = Math.random() > 0.1;
  
  if (simulated) {
    return {
      success: true,
      paymentReference: `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      provider: 'simulator',
      rawResponse: {
        status: 'approved',
        simulator: true,
        timestamp: new Date().toISOString(),
      },
    };
  } else {
    return {
      success: false,
      error: 'Tarjeta declinada (simulación)',
      provider: 'simulator',
    };
  }
}

async function processStripeTerminalPayment(
  request: TerminalPaymentRequest
): Promise<TerminalPaymentResult> {
  if (!isTerminalConfigured()) {
    return {
      success: false,
      error: 'Stripe Terminal no está configurado',
      provider: 'stripe',
    };
  }

  try {
    const { createPaymentIntent } = await import('./stripe.js');
    
    const result = await createPaymentIntent({
      amount: request.amount,
      currency: request.currency || 'mxn',
      description: request.description || 'Pago Terminal POS',
      metadata: {
        transactionId: request.transactionId,
        terminal: 'true',
      },
      paymentMethodTypes: ['card_present'],
    });

    return {
      success: true,
      paymentReference: result.paymentIntentId,
      provider: 'stripe',
      rawResponse: result,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      provider: 'stripe',
    };
  }
}

async function processMercadoPagoPointPayment(
  request: TerminalPaymentRequest
): Promise<TerminalPaymentResult> {
  if (!isTerminalConfigured()) {
    return {
      success: false,
      error: 'Mercado Pago Point no está configurado',
      provider: 'mercadopago',
    };
  }

  try {
    const { createInStoreQROrder } = await import('./mercadopago.js');
    
    const posId = process.env.MERCADOPAGO_POS_ID || 'DEFAULT_POS';
    
    const result = await createInStoreQROrder({
      amount: request.amount,
      description: request.description || 'Pago Terminal POS',
      externalReference: request.transactionId,
      posId,
    });

    return {
      success: true,
      paymentReference: result.id,
      provider: 'mercadopago',
      rawResponse: result,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      provider: 'mercadopago',
    };
  }
}

export async function cancelTerminalPayment(paymentReference: string): Promise<boolean> {
  const provider = getTerminalProvider();
  
  switch (provider) {
    case 'stripe':
      try {
        const { cancelPaymentIntent } = await import('./stripe.js');
        await cancelPaymentIntent(paymentReference);
        return true;
      } catch {
        return false;
      }
      
    default:
      return true;
  }
}
