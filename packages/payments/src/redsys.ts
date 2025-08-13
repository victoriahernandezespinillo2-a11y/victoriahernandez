import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@repo/db';

// Esquemas de validación para Redsys
const redsysPaymentSchema = z.object({
  amount: z.number().positive('El monto debe ser positivo'),
  order: z.string().min(4).max(12),
  merchantCode: z.string(),
  terminal: z.string().default('1'),
  currency: z.string().default('978'), // EUR
  transactionType: z.string().default('0'), // Autorización
  productDescription: z.string().optional(),
  titular: z.string().optional(),
  merchantName: z.string().optional(),
  merchantUrl: z.string().optional(),
  urlOk: z.string().url(),
  urlKo: z.string().url(),
});

// Tipos
export interface RedsysPaymentData {
  amount: number;
  order: string;
  merchantCode: string;
  terminal?: string;
  currency?: string;
  transactionType?: string;
  productDescription?: string;
  titular?: string;
  merchantName?: string;
  merchantUrl?: string;
  urlOk: string;
  urlKo: string;
}

export interface RedsysResponse {
  Ds_Date?: string;
  Ds_Hour?: string;
  Ds_Amount?: string;
  Ds_Currency?: string;
  Ds_Order?: string;
  Ds_MerchantCode?: string;
  Ds_Terminal?: string;
  Ds_Response?: string;
  Ds_MerchantData?: string;
  Ds_SecurePayment?: string;
  Ds_TransactionType?: string;
  Ds_Card_Country?: string;
  Ds_AuthorisationCode?: string;
  Ds_ConsumerLanguage?: string;
  Ds_Card_Type?: string;
}

// Clase para manejar Redsys
export class RedsysService {
  private merchantKey: string;
  private testMode: boolean;

  constructor() {
    this.merchantKey = process.env.REDSYS_MERCHANT_KEY!;
    this.testMode = process.env.NODE_ENV !== 'production';
  }

  // URLs de Redsys
  private getRedsysUrl(): string {
    return this.testMode
      ? 'https://sis-t.redsys.es:25443/sis/realizarPago'
      : 'https://sis.redsys.es/sis/realizarPago';
  }

  // Crear parámetros para el formulario de pago
  async createPaymentForm(data: RedsysPaymentData): Promise<{
    Ds_SignatureVersion: string;
    Ds_MerchantParameters: string;
    Ds_Signature: string;
    action: string;
  }> {
    const validatedData = redsysPaymentSchema.parse(data);

    // Preparar parámetros del comercio
    const merchantParameters = {
      DS_MERCHANT_AMOUNT: (validatedData.amount * 100).toString(), // Centavos
      DS_MERCHANT_ORDER: validatedData.order,
      DS_MERCHANT_MERCHANTCODE: validatedData.merchantCode,
      DS_MERCHANT_CURRENCY: validatedData.currency,
      DS_MERCHANT_TRANSACTIONTYPE: validatedData.transactionType,
      DS_MERCHANT_TERMINAL: validatedData.terminal,
      DS_MERCHANT_MERCHANTURL: validatedData.merchantUrl || '',
      DS_MERCHANT_URLOK: validatedData.urlOk,
      DS_MERCHANT_URLKO: validatedData.urlKo,
      DS_MERCHANT_PRODUCTDESCRIPTION: validatedData.productDescription || '',
      DS_MERCHANT_TITULAR: validatedData.titular || '',
      DS_MERCHANT_MERCHANTNAME: validatedData.merchantName || '',
    };

    // Codificar parámetros en Base64
    const merchantParametersBase64 = Buffer.from(
      JSON.stringify(merchantParameters)
    ).toString('base64');

    // Crear firma
    const signature = this.createSignature(validatedData.order, merchantParametersBase64);

    // Registrar intento de pago
    await db.outboxEvent.create({
      data: {
        eventType: 'REDSYS_PAYMENT_INITIATED',
        eventData: {
          order: validatedData.order,
          amount: validatedData.amount,
          merchantCode: validatedData.merchantCode,
          parameters: merchantParameters,
        },
      },
    });

    return {
      Ds_SignatureVersion: 'HMAC_SHA256_V1',
      Ds_MerchantParameters: merchantParametersBase64,
      Ds_Signature: signature,
      action: this.getRedsysUrl(),
    };
  }

  // Crear firma HMAC SHA256
  private createSignature(order: string, merchantParameters: string): string {
    // Crear clave derivada usando 3DES-CBC con IV en cero
    const key = Buffer.from(this.merchantKey, 'base64'); // 24 bytes esperados
    const iv = Buffer.alloc(8, 0);

    // Padding manual para el número de pedido (PKCS#7 sobre bloque de 8)
    const paddedOrder = this.addPadding(order);

    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    cipher.setAutoPadding(false);

    const derivedKey = Buffer.concat([
      cipher.update(Buffer.from(paddedOrder, 'utf8')),
      cipher.final(),
    ]);

    // Crear HMAC con la clave derivada
    const hmac = crypto.createHmac('sha256', derivedKey);
    hmac.update(merchantParameters);

    return hmac.digest('base64');
  }

  // Añadir padding al número de pedido
  private addPadding(order: string): string {
    const blockSize = 8;
    const paddingLength = blockSize - (order.length % blockSize);
    const padding = String.fromCharCode(paddingLength).repeat(paddingLength);
    return order + padding;
  }

  // Verificar respuesta de Redsys
  async verifyResponse({
    signature,
    merchantParameters,
  }: {
    signature: string;
    merchantParameters: string;
  }): Promise<{
    isValid: boolean;
    data?: RedsysResponse;
    error?: string;
  }> {
    try {
      // Decodificar parámetros
      const decodedParameters = Buffer.from(merchantParameters, 'base64').toString('utf8');
      const responseData: RedsysResponse = JSON.parse(decodedParameters);

      // Verificar firma
      const expectedSignature = this.createSignature(
        responseData.Ds_Order || '',
        merchantParameters
      );

      const isValid = signature === expectedSignature;

      if (isValid) {
        // Registrar respuesta exitosa
        await db.outboxEvent.create({
          data: {
            eventType: 'REDSYS_PAYMENT_RESPONSE',
            eventData: {
              order: responseData.Ds_Order,
              response: responseData.Ds_Response,
              amount: responseData.Ds_Amount,
              authCode: responseData.Ds_AuthorisationCode,
              isSuccess: this.isSuccessResponse(responseData.Ds_Response || ''),
            },
          },
        });
      }

      return {
        isValid,
        data: isValid ? responseData : undefined,
        error: isValid ? undefined : 'Firma inválida',
      };
    } catch (error) {
      console.error('Error verificando respuesta de Redsys:', error);
      return {
        isValid: false,
        error: 'Error procesando respuesta',
      };
    }
  }

  // Verificar si la respuesta indica éxito
  private isSuccessResponse(response: string): boolean {
    const responseCode = parseInt(response, 10);
    return responseCode >= 0 && responseCode <= 99;
  }

  // Obtener descripción del código de respuesta
  getResponseDescription(responseCode: string): string {
    const code = parseInt(responseCode, 10);
    
    if (code >= 0 && code <= 99) {
      return 'Transacción autorizada';
    }
    
    const errorCodes: Record<number, string> = {
      900: 'Transacción autorizada para devoluciones y confirmaciones',
      101: 'Tarjeta caducada',
      102: 'Tarjeta en excepción transitoria o bajo sospecha de fraude',
      106: 'Intentos de PIN excedidos',
      125: 'Tarjeta no efectiva',
      129: 'Código de seguridad (CVV2/CVC2) incorrecto',
      180: 'Tarjeta ajena al servicio',
      184: 'Error en la autenticación del titular',
      190: 'Denegación del emisor sin especificar motivo',
      191: 'Fecha de caducidad errónea',
      202: 'Tarjeta en excepción transitoria o bajo sospecha de fraude con retirada de tarjeta',
      904: 'Comercio no registrado en FUC',
      909: 'Error de sistema',
      913: 'Pedido repetido',
      944: 'Sesión incorrecta',
      950: 'Operación de devolución no permitida',
    };
    
    return errorCodes[code] || `Error desconocido (${responseCode})`;
  }

  // Generar número de pedido único
  generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return (timestamp + random).slice(-12); // Máximo 12 caracteres
  }

  // Procesar notificación de Redsys
  async processNotification({
    signature,
    merchantParameters,
  }: {
    signature: string;
    merchantParameters: string;
  }): Promise<{
    success: boolean;
    order?: string;
    amount?: number;
    authCode?: string;
    error?: string;
  }> {
    const verification = await this.verifyResponse({ signature, merchantParameters });
    
    if (!verification.isValid || !verification.data) {
      return {
        success: false,
        error: verification.error || 'Verificación fallida',
      };
    }
    
    const { data } = verification;
    const isSuccess = this.isSuccessResponse(data.Ds_Response || '');
    
    // Registrar en webhook events
    await db.webhookEvent.create({
      data: {
        provider: 'redsys',
        eventType: isSuccess ? 'payment_succeeded' : 'payment_failed',
        eventId: data.Ds_Order || '',
        eventData: data,
        processed: false,
      },
    });
    
    return {
      success: isSuccess,
      order: data.Ds_Order,
      amount: data.Ds_Amount ? parseInt(data.Ds_Amount) / 100 : undefined,
      authCode: data.Ds_AuthorisationCode,
      error: isSuccess ? undefined : this.getResponseDescription(data.Ds_Response || ''),
    };
  }
}

// Instancia singleton
export const redsysService = new RedsysService();

// Constantes útiles
export const REDSYS_CURRENCIES = {
  EUR: '978',
  USD: '840',
  GBP: '826',
} as const;

export const REDSYS_TRANSACTION_TYPES = {
  AUTHORIZATION: '0',
  PREAUTHORIZATION: '1',
  CONFIRMATION: '2',
  REFUND: '3',
  RECURRING: '5',
  SUCCESSIVE: '6',
  AUTHENTICATION: '7',
  CONFIRMATION_PREAUTH: '8',
  CANCEL_PREAUTH: '9',
} as const;

export const REDSYS_LANGUAGES = {
  SPANISH: '001',
  ENGLISH: '002',
  CATALAN: '003',
  FRENCH: '004',
  GERMAN: '005',
  DUTCH: '006',
  ITALIAN: '007',
  SWEDISH: '008',
  PORTUGUESE: '009',
  VALENCIAN: '010',
  POLISH: '011',
  GALICIAN: '012',
  BASQUE: '013',
} as const;