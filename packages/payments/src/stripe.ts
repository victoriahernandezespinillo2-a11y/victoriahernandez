import Stripe from 'stripe';
import { z } from 'zod';
import { db } from '@repo/db';

// Configuración de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

// Esquemas de validación
const createPaymentIntentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  currency: z.string().default('eur'),
  metadata: z.record(z.string()).optional(),
  description: z.string().optional(),
  customerId: z.string().optional(),
});

const createCustomerSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const createSubscriptionSchema = z.object({
  customerId: z.string(),
  priceId: z.string(),
  metadata: z.record(z.string()).optional(),
});

// Tipos
export interface PaymentIntentData {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  description?: string;
  customerId?: string;
}

export interface CustomerData {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionData {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
}

// Funciones de Stripe
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = stripe;
  }

  // Crear Payment Intent para pagos únicos
  async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    const validatedData = createPaymentIntentSchema.parse(data);
    
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(validatedData.amount * 100), // Convertir a centavos
      currency: validatedData.currency,
      metadata: validatedData.metadata || {},
      description: validatedData.description,
      customer: validatedData.customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Registrar en la base de datos
    await db.outboxEvent.create({
      data: {
        eventType: 'PAYMENT_INTENT_CREATED',
        eventData: {
          paymentIntentId: paymentIntent.id,
          amount: validatedData.amount,
          currency: validatedData.currency,
          customerId: validatedData.customerId,
          metadata: validatedData.metadata,
        },
      },
    });

    return paymentIntent;
  }

  // Crear cliente en Stripe
  async createCustomer(data: CustomerData): Promise<Stripe.Customer> {
    const validatedData = createCustomerSchema.parse(data);
    
    const customer = await this.stripe.customers.create({
      email: validatedData.email,
      name: validatedData.name,
      phone: validatedData.phone,
      metadata: validatedData.metadata || {},
    });

    return customer;
  }

  // Crear suscripción
  async createSubscription(data: SubscriptionData): Promise<Stripe.Subscription> {
    const validatedData = createSubscriptionSchema.parse(data);
    
    const subscription = await this.stripe.subscriptions.create({
      customer: validatedData.customerId,
      items: [{
        price: validatedData.priceId,
      }],
      metadata: validatedData.metadata || {},
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  }

  // Obtener información de un pago
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  // Confirmar un pago
  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.confirm(paymentIntentId);
  }

  // Cancelar un pago
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  // Crear precio para suscripciones
  async createPrice({
    productId,
    amount,
    currency = 'eur',
    interval,
    intervalCount = 1,
  }: {
    productId: string;
    amount: number;
    currency?: string;
    interval: 'month' | 'year';
    intervalCount?: number;
  }): Promise<Stripe.Price> {
    return await this.stripe.prices.create({
      product: productId,
      unit_amount: Math.round(amount * 100),
      currency,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
    });
  }

  // Crear producto
  async createProduct({
    name,
    description,
    metadata,
  }: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Product> {
    return await this.stripe.products.create({
      name,
      description,
      metadata: metadata || {},
    });
  }

  // Procesar webhook
  async processWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      // Registrar evento en la base de datos
      await db.webhookEvent.create({
        data: {
          provider: 'stripe',
          eventType: event.type,
          eventId: event.id,
          eventData: event.data,
          processed: false,
        },
      });

      return event;
    } catch (error) {
      console.error('Error procesando webhook de Stripe:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  // Obtener métodos de pago de un cliente
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  // Crear Setup Intent para guardar método de pago
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });
  }

  // Reembolsar un pago
  async createRefund({
    paymentIntentId,
    amount,
    reason,
  }: {
    paymentIntentId: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<Stripe.Refund> {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    if (reason) {
      refundData.reason = reason;
    }

    return await this.stripe.refunds.create(refundData);
  }
}

// Instancia singleton
export const stripeService = new StripeService();

// Exportar Stripe para uso directo si es necesario
export { stripe };

// Constantes útiles
export const STRIPE_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
} as const;

export type StripeEventType = typeof STRIPE_EVENTS[keyof typeof STRIPE_EVENTS];