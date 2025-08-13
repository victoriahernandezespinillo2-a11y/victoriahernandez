// Importar servicios para uso interno
import { StripeService, stripeService } from './stripe';
import { RedsysService, redsysService } from './redsys';
import type { PaymentIntentData, CustomerData, SubscriptionData } from './stripe';
import type { RedsysPaymentData } from './redsys';

// Exportar servicios de Stripe
export {
  StripeService,
  stripeService,
  getStripeClient,
  STRIPE_EVENTS,
  type StripeEventType,
  type PaymentIntentData,
  type CustomerData,
  type SubscriptionData,
} from './stripe';

// Exportar servicios de Redsys
export {
  RedsysService,
  redsysService,
  REDSYS_CURRENCIES,
  REDSYS_TRANSACTION_TYPES,
  REDSYS_LANGUAGES,
  type RedsysPaymentData,
  type RedsysResponse,
} from './redsys';

// Servicio unificado de pagos
export class PaymentService {
  private stripe: StripeService;
  private redsys: RedsysService;

  constructor() {
    this.stripe = stripeService;
    this.redsys = redsysService;
  }

  // Crear pago con Stripe
  async createStripePayment(data: PaymentIntentData) {
    return await this.stripe.createPaymentIntent(data);
  }

  // Crear pago con Redsys
  async createRedsysPayment(data: RedsysPaymentData) {
    return await this.redsys.createPaymentForm(data);
  }

  // Procesar webhook de Stripe
  async processStripeWebhook(payload: string, signature: string) {
    return await this.stripe.processWebhook(payload, signature);
  }

  // Procesar notificación de Redsys
  async processRedsysNotification(data: { signature: string; merchantParameters: string }) {
    return await this.redsys.processNotification(data);
  }

  // Crear cliente en Stripe
  async createStripeCustomer(data: CustomerData) {
    return await this.stripe.createCustomer(data);
  }

  // Crear suscripción en Stripe
  async createStripeSubscription(data: SubscriptionData) {
    return await this.stripe.createSubscription(data);
  }

  // Confirmar pago de Stripe
  async confirmStripePayment(paymentIntentId: string) {
    return await this.stripe.confirmPaymentIntent(paymentIntentId);
  }

  // Reembolsar pago de Stripe
  async refundStripePayment(paymentIntentId: string, amount?: number) {
    return await this.stripe.createRefund({ paymentIntentId, amount });
  }

  // Generar número de pedido para Redsys
  generateRedsysOrderNumber() {
    return this.redsys.generateOrderNumber();
  }

  // Verificar respuesta de Redsys
  async verifyRedsysResponse(data: { signature: string; merchantParameters: string }) {
    return await this.redsys.verifyResponse(data);
  }

  // Obtener descripción de código de respuesta de Redsys
  getRedsysResponseDescription(responseCode: string) {
    return this.redsys.getResponseDescription(responseCode);
  }
}

// Instancia singleton del servicio unificado
export const paymentService = new PaymentService();

// Tipos útiles
export interface PaymentProvider {
  stripe: 'stripe';
  redsys: 'redsys';
}

export interface PaymentResult {
  success: boolean;
  provider: 'stripe' | 'redsys';
  transactionId?: string;
  amount?: number;
  currency?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number;
  error?: string;
}

// Utilidades para pagos
export const PaymentUtils = {
  // Convertir euros a centavos
  eurosToCents: (euros: number): number => Math.round(euros * 100),
  
  // Convertir centavos a euros
  centsToEuros: (cents: number): number => cents / 100,
  
  // Validar monto mínimo
  isValidAmount: (amount: number, minAmount = 0.5): boolean => amount >= minAmount,
  
  // Formatear monto para mostrar
  formatAmount: (amount: number, currency = 'EUR'): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
    }).format(amount);
  },
  
  // Generar ID de transacción único
  generateTransactionId: (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `txn_${timestamp}_${random}`;
  },
  
  // Validar tarjeta de crédito (algoritmo de Luhn)
  validateCreditCard: (cardNumber: string): boolean => {
    const num = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },
  
  // Detectar tipo de tarjeta
  detectCardType: (cardNumber: string): string => {
    const num = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(num)) return 'visa';
    if (/^5[1-5]/.test(num)) return 'mastercard';
    if (/^3[47]/.test(num)) return 'amex';
    if (/^6(?:011|5)/.test(num)) return 'discover';
    
    return 'unknown';
  },
};

// Constantes de configuración
export const PAYMENT_CONFIG = {
  MIN_AMOUNT_EUR: 0.5,
  MAX_AMOUNT_EUR: 999999.99,
  DEFAULT_CURRENCY: 'EUR',
  SUPPORTED_CURRENCIES: ['EUR', 'USD', 'GBP'],
  WEBHOOK_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
} as const;

// Errores personalizados
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: 'stripe' | 'redsys'
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class WebhookError extends Error {
  constructor(
    message: string,
    public provider: 'stripe' | 'redsys',
    public eventId?: string
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

// Middleware para validar webhooks
export const validateWebhook = (provider: 'stripe' | 'redsys') => {
  return async (req: any, res: any, next: any) => {
    try {
      if (provider === 'stripe') {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
          throw new WebhookError('Missing Stripe signature', 'stripe');
        }
        // La validación real se hace en el servicio
      } else if (provider === 'redsys') {
        const { Ds_Signature, Ds_MerchantParameters } = req.body;
        if (!Ds_Signature || !Ds_MerchantParameters) {
          throw new WebhookError('Missing Redsys parameters', 'redsys');
        }
      }
      
      next();
    } catch (error) {
      console.error(`Webhook validation error for ${provider}:`, error);
      res.status(400).json({ error: 'Invalid webhook' });
    }
  };
};