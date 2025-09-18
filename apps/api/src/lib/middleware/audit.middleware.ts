/**
 * Middleware de Auditoría Enterprise
 * Registra automáticamente eventos de auditoría para operaciones críticas
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '../services/audit.service';

const auditService = new AuditService();

export interface AuditContext {
  userId?: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditConfig {
  action: string;
  resource?: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'DATA_MODIFICATION' | 
           'SYSTEM' | 'SECURITY' | 'PAYMENT' | 'RESERVATION' | 'USER_MANAGEMENT' | 
           'CONFIGURATION' | 'MAINTENANCE' | 'API' | 'EXTERNAL';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tags?: string[];
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeHeaders?: boolean;
  sensitiveFields?: string[];
}

/**
 * Middleware de auditoría que envuelve handlers de API
 */
export function withAuditMiddleware(
  config: AuditConfig,
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;
    let error: Error | null = null;
    
    try {
      // Ejecutar el handler original
      response = await handler(req, context);
    } catch (err) {
      error = err as Error;
      throw err; // Re-lanzar el error para que sea manejado por el sistema
    } finally {
      // Registrar el evento de auditoría (asíncrono, no bloquea la respuesta)
      setImmediate(async () => {
        try {
          const duration = Date.now() - startTime;
          const auditContext = extractAuditContext(req);
          
          // Determinar el estado basado en la respuesta o error
          let status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'FAILED' = 'SUCCESS';
          let severity = config.severity || 'LOW';
          let errorCode: string | undefined;
          let errorMessage: string | undefined;
          
          if (error) {
            status = 'ERROR';
            severity = 'HIGH';
            errorMessage = error.message;
            errorCode = error.name;
          } else if (response && !response.ok) {
            status = response.status >= 500 ? 'ERROR' : 'WARNING';
            severity = response.status >= 500 ? 'HIGH' : 'MEDIUM';
            errorCode = response.status.toString();
          }
          
          // Extraer información del recurso
          const resourceId = extractResourceId(req, context);
          const entityType = extractEntityType(req, context);
          const entityId = extractEntityId(req, context);
          
          // Construir detalles
          const details = buildAuditDetails(req, response, config, error);
          
          // Crear metadata
          const metadata = buildAuditMetadata(req, response, config, error);
          
          await auditService.createAuditLog({
            userId: auditContext.userId,
            userName: auditContext.userName,
            userEmail: auditContext.userEmail,
            userRole: auditContext.userRole,
            action: config.action,
            resource: config.resource,
            resourceId,
            entityType,
            entityId,
            details,
            metadata,
            ipAddress: auditContext.ipAddress,
            userAgent: auditContext.userAgent,
            sessionId: auditContext.sessionId,
            status,
            severity,
            category: config.category,
            tags: config.tags || [],
            duration,
            errorCode,
            errorMessage
          });
        } catch (auditError) {
          console.error('Error registrando evento de auditoría:', auditError);
          // No lanzar error para no afectar la respuesta principal
        }
      });
    }
    
    return response;
  };
}

/**
 * Middleware de auditoría para operaciones de base de datos
 */
export function withDatabaseAuditMiddleware(
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW',
  resource: string,
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  const config: AuditConfig = {
    action: operation,
    resource,
    category: 'DATA_MODIFICATION',
    severity: operation === 'DELETE' ? 'HIGH' : 'MEDIUM',
    tags: ['database', operation.toLowerCase()],
    includeRequestBody: true,
    sensitiveFields: ['password', 'token', 'secret', 'key']
  };
  
  return withAuditMiddleware(config, handler);
}

/**
 * Middleware de auditoría para autenticación
 */
export function withAuthAuditMiddleware(
  action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION',
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  const config: AuditConfig = {
    action,
    resource: 'user',
    category: 'AUTHENTICATION',
    severity: action === 'LOGIN' ? 'HIGH' : 'MEDIUM',
    tags: ['authentication', action.toLowerCase()],
    includeRequestBody: false, // No incluir credenciales
    sensitiveFields: ['password', 'token', 'secret']
  };
  
  return withAuditMiddleware(config, handler);
}

/**
 * Middleware de auditoría para pagos
 */
export function withPaymentAuditMiddleware(
  action: 'PAYMENT_INITIATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'REFUND',
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  const config: AuditConfig = {
    action,
    resource: 'payment',
    category: 'PAYMENT',
    severity: 'HIGH',
    tags: ['payment', action.toLowerCase()],
    includeRequestBody: false, // No incluir datos de pago sensibles
    sensitiveFields: ['cardNumber', 'cvv', 'expiry', 'iban']
  };
  
  return withAuditMiddleware(config, handler);
}

/**
 * Extraer contexto de auditoría de la request
 */
function extractAuditContext(req: NextRequest): AuditContext {
  const userAgent = req.headers.get('user-agent') || undefined;
  const ipAddress = req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   req.headers.get('x-client-ip') ||
                   undefined;
  
  // Extraer información del usuario de headers o JWT
  const userId = req.headers.get('x-user-id') || undefined;
  const userName = req.headers.get('x-user-name') || 'Sistema';
  const userEmail = req.headers.get('x-user-email') || undefined;
  const userRole = req.headers.get('x-user-role') || undefined;
  const sessionId = req.headers.get('x-session-id') || undefined;
  
  return {
    userId,
    userName,
    userEmail,
    userRole,
    ipAddress,
    userAgent,
    sessionId
  };
}

/**
 * Extraer ID del recurso de la request
 */
function extractResourceId(req: NextRequest, context?: any): string | undefined {
  // Intentar extraer de la URL
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  
  // Buscar patrones como /api/users/[id], /api/reservations/[id], etc.
  for (let i = 0; i < pathSegments.length - 1; i++) {
    if (pathSegments[i + 1] && pathSegments[i + 1] !== 'api') {
      return pathSegments[i + 1];
    }
  }
  
  // Intentar extraer del contexto
  if (context?.params?.id) {
    return context.params.id;
  }
  
  return undefined;
}

/**
 * Extraer tipo de entidad de la request
 */
function extractEntityType(req: NextRequest, context?: any): string | undefined {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  
  // Buscar en la URL
  for (let i = 0; i < pathSegments.length; i++) {
    if (pathSegments[i] === 'api' && pathSegments[i + 1]) {
      return pathSegments[i + 1];
    }
  }
  
  return undefined;
}

/**
 * Extraer ID de entidad de la request
 */
function extractEntityId(req: NextRequest, context?: any): string | undefined {
  return extractResourceId(req, context);
}

/**
 * Construir detalles de auditoría
 */
function buildAuditDetails(
  req: NextRequest, 
  response: NextResponse, 
  config: AuditConfig, 
  error: Error | null
): string {
  const details: any = {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  };
  
  if (config.includeRequestBody && req.method !== 'GET') {
    // En un caso real, aquí se leería el body de la request
    // Por ahora, solo indicamos que se incluyó
    details.requestBodyIncluded = true;
  }
  
  if (config.includeResponseBody && response) {
    details.responseStatus = response.status;
    details.responseStatusText = response.statusText;
  }
  
  if (error) {
    details.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  return JSON.stringify(details);
}

/**
 * Construir metadata de auditoría
 */
function buildAuditMetadata(
  req: NextRequest, 
  response: NextResponse, 
  config: AuditConfig, 
  error: Error | null
): Record<string, any> {
  const metadata: Record<string, any> = {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
    origin: req.headers.get('origin')
  };
  
  if (config.includeHeaders) {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Filtrar headers sensibles
      if (!config.sensitiveFields?.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        headers[key] = value;
      }
    });
    metadata.headers = headers;
  }
  
  if (response) {
    metadata.responseStatus = response.status;
    metadata.responseHeaders = Object.fromEntries(response.headers.entries());
  }
  
  if (error) {
    metadata.error = {
      name: error.name,
      message: error.message
    };
  }
  
  return metadata;
}

/**
 * Helper para crear eventos de auditoría manuales
 */
export async function logAuditEvent(
  context: AuditContext,
  config: Omit<AuditConfig, 'category'> & { category: AuditConfig['category'] },
  additionalData?: Record<string, any>
) {
  try {
    await auditService.createAuditLog({
      userId: context.userId,
      userName: context.userName,
      userEmail: context.userEmail,
      userRole: context.userRole,
      action: config.action,
      resource: config.resource,
      details: additionalData ? JSON.stringify(additionalData) : undefined,
      metadata: additionalData,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      status: 'SUCCESS',
      severity: config.severity || 'LOW',
      category: config.category,
      tags: config.tags || []
    });
  } catch (error) {
    console.error('Error registrando evento de auditoría manual:', error);
  }
}
