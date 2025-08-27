import crypto from 'crypto';
import { z } from 'zod';
import { db } from '@repo/db';

// Esquemas de validación para Redsys
const redsysPaymentSchema = z.object({
  amount: z.union([z.number().positive(), z.string().regex(/^\d+$/)]).refine(val => Number(val) > 0, 'El monto debe ser positivo'),
  order: z.string().min(4).max(12),
  merchantCode: z.string(),
  terminal: z.string().default('001'),
  currency: z.string().default('978'), // EUR
  transactionType: z.string().default('0'), // Autorización
  productDescription: z.string().optional(),
  titular: z.string().optional(),
  merchantName: z.string().optional(),
  merchantUrl: z.string().optional(),
  urlOk: z.string().url(),
  urlKo: z.string().url(),
  // Permitir datos personalizados del comercio (se codificarán en base64)
  merchantData: z.any().optional(),
  /** Si true se añade DS_MERCHANT_PAYMETHODS='z' para habilitar Bizum */
  useBizum: z.boolean().optional(),
});

// Tipos
export interface RedsysPaymentData {
  amount: number | string;
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
  merchantData?: any;
  /** Si true se añade DS_MERCHANT_PAYMETHODS='z' para habilitar Bizum */
  useBizum?: boolean;
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
  private merchantKeyB64: string
  private merchantKeyBytes: Buffer
  private testMode: boolean;

  constructor() {
    this.testMode = process.env.NODE_ENV !== 'production';
    
    // Configuración robusta con fallback a valores genéricos de test
    const testKey = process.env.REDSYS_TEST_MERCHANT_KEY;
    const prodKey = process.env.REDSYS_MERCHANT_KEY;
    
    // Priorizar clave de test en desarrollo, fallback a producción
    this.merchantKeyB64 = this.testMode && testKey ? testKey : (prodKey || '');
    
    // Si no hay clave configurada, usar la clave genérica de test de Redsys
    if (!this.merchantKeyB64) {
      console.warn('⚠️ [REDSYS-CONFIG] No se encontró clave configurada, usando clave genérica de test');
      this.merchantKeyB64 = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7'; // Clave oficial de test de Redsys
    }
    
    // Decodificar y validar longitud de clave 3DES (24 bytes)
    try {
      this.merchantKeyBytes = Buffer.from(this.merchantKeyB64, 'base64');
      if (this.merchantKeyBytes.length !== 24) {
        throw new Error(`Longitud incorrecta: ${this.merchantKeyBytes.length} bytes, se esperaban 24`);
      }
      
      console.log('✅ [REDSYS-CONFIG] Clave inicializada correctamente:', {
        keyLength: this.merchantKeyBytes.length,
        testMode: this.testMode,
        keySource: testKey ? 'TEST_KEY' : (prodKey ? 'PROD_KEY' : 'GENERIC_TEST')
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ [REDSYS-KEY] Error inicializando clave:', errorMessage);
      throw new Error(`Clave Redsys inválida: ${errorMessage}. Verifica que sea una clave base64 válida de 24 bytes.`);
    }
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

    // Construir MerchantData (opcional)
    let merchantDataEncoded: string | undefined;
    if (validatedData.merchantData !== undefined) {
      try {
        const raw = typeof validatedData.merchantData === 'string' ? validatedData.merchantData : JSON.stringify(validatedData.merchantData);
        merchantDataEncoded = Buffer.from(raw, 'utf8').toString('base64');
      } catch {
        // Si falla la serialización, lo omitimos para no romper el flujo
        merchantDataEncoded = undefined;
      }
    }

    // CRÍTICO: Payload MÍNIMO según documentación oficial Redsys (solo campos esenciales)
    const merchantParameters: Record<string, string> = {
      DS_MERCHANT_AMOUNT: validatedData.amount.toString(), // Ya viene en céntimos desde la API
      DS_MERCHANT_ORDER: validatedData.order,
      DS_MERCHANT_MERCHANTCODE: validatedData.merchantCode,
      DS_MERCHANT_CURRENCY: validatedData.currency!,
      DS_MERCHANT_TRANSACTIONTYPE: validatedData.transactionType!,
      DS_MERCHANT_TERMINAL: validatedData.terminal!,
      DS_MERCHANT_MERCHANTURL: validatedData.merchantUrl || '',
      DS_MERCHANT_URLOK: validatedData.urlOk,
      DS_MERCHANT_URLKO: validatedData.urlKo,
    };

    // Bizum requiere indicar método de pago 'z'
    if ((data as any).useBizum) {
      merchantParameters.DS_MERCHANT_PAYMETHODS = 'z';
    }

    console.log('🔧 [REDSYS-MINIMAL] Payload mínimo:', {
      amount: merchantParameters.DS_MERCHANT_AMOUNT,
      order: merchantParameters.DS_MERCHANT_ORDER,
      merchantCode: merchantParameters.DS_MERCHANT_MERCHANTCODE,
      terminal: merchantParameters.DS_MERCHANT_TERMINAL,
      currency: merchantParameters.DS_MERCHANT_CURRENCY
    });

    // Incluir campos opcionales si existen
    if (validatedData.productDescription) {
      merchantParameters.DS_MERCHANT_PRODUCTDESCRIPTION = validatedData.productDescription;
    }
    if (validatedData.titular) {
      merchantParameters.DS_MERCHANT_TITULAR = validatedData.titular;
    }
    if (validatedData.merchantName) {
      merchantParameters.DS_MERCHANT_MERCHANTNAME = validatedData.merchantName;
    }
    if (merchantDataEncoded) {
      merchantParameters.DS_MERCHANT_MERCHANTDATA = merchantDataEncoded;
    }

    // CRÍTICO: JSON.stringify YA genera el formato correcto (no necesita escape manual)
    const jsonString = JSON.stringify(merchantParameters);
    
    console.log('🔧 [REDSYS-JSON] JSON generado:', jsonString);
    
    // Codificar parámetros en Base64 estándar (y firmar sobre el mismo valor que enviamos)
    const merchantParametersBase64 = Buffer.from(jsonString).toString('base64');

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

  // Crear firma HMAC SHA256 (implementación compatible con librerías oficiales Redsys)
  private createSignature(order: string, merchantParameters: string): string {
    // Crear clave derivada usando 3DES-CBC con IV en cero y relleno de ceros (zero-padding)
    const key = this.merchantKeyBytes; // 24 bytes ya validados
    const iv = Buffer.alloc(8, 0);

    // Redsys espera un cifrado 3DES con relleno de ceros (zero-padding).
    // Node.js por defecto usa PKCS#7 padding, que es diferente.
    // Por eso, deshabilitamos el auto-padding y lo hacemos manualmente.
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    cipher.setAutoPadding(false);

    // Aplicar zero-padding manualmente
    const orderBuffer = Buffer.from(order, 'utf8');
    const blockSize = 8;
    const padding = blockSize - (orderBuffer.length % blockSize);
    const paddedOrder = Buffer.concat([orderBuffer, Buffer.alloc(padding, 0)]);
    
    const derivedKey = Buffer.concat([
      cipher.update(paddedOrder),
      cipher.final(),
    ]);

    // Crear HMAC con la clave derivada sobre merchantParameters
    const hmac = crypto.createHmac('sha256', derivedKey);
    hmac.update(merchantParameters, 'utf8');  // Especificar encoding explícitamente

    return hmac.digest('base64');
  }

  // (Padding manual ya no necesario: usamos autoPadding del cifrador)

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

  // Generar número de pedido único (formato compatible con Redsys)
  generateOrderNumber(): string {
    // Usar timestamp más corto + random para evitar colisiones
    const timestamp = (Date.now() % 100000000).toString(); // 8 dígitos max
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 dígitos
    const orderNumber = timestamp + random; // 11 dígitos total
    
    console.log('🔢 [REDSYS-ORDER] Número generado:', orderNumber);
    return orderNumber;
  }

  // Validar configuración de merchant (para debugging)
  static validateMerchantConfig(merchantCode: string, merchantKey: string): {
    isValid: boolean;
    warnings: string[];
    merchantType: 'SPECIFIC' | 'GENERIC' | 'INVALID';
  } {
    const warnings: string[] = [];
    let merchantType: 'SPECIFIC' | 'GENERIC' | 'INVALID' = 'INVALID';

    // Validar merchant code
    if (!merchantCode || !/^\d{9}$/.test(merchantCode)) {
      warnings.push('Merchant code debe ser 9 dígitos');
      return { isValid: false, warnings, merchantType };
    }

    // Identificar tipo de merchant
    if (merchantCode === '999008881') {
      merchantType = 'GENERIC';
    } else if (merchantCode.length === 9) {
      merchantType = 'SPECIFIC';
    }

    // Validar clave
    try {
      const keyBytes = Buffer.from(merchantKey, 'base64');
      if (keyBytes.length !== 24) {
        warnings.push(`Clave debe ser 24 bytes (actual: ${keyBytes.length})`);
        return { isValid: false, warnings, merchantType };
      }
    } catch (error) {
      warnings.push('Clave no es base64 válido');
      return { isValid: false, warnings, merchantType };
    }

    // Clave genérica conocida
    if (merchantKey === 'sq7HjrUOBfKmC576ILgskD5srU870gJ7') {
      if (merchantType === 'SPECIFIC') {
        warnings.push('Usando clave genérica con merchant específico - puede causar errores');
      }
    }

    return { isValid: true, warnings, merchantType };
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
        eventData: data as any,
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