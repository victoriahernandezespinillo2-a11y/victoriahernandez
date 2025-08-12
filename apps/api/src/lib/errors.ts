import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'EXTERNAL_SERVICE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: ErrorCode = 'INTERNAL_ERROR', status = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationAppError extends AppError {
  constructor(message = 'Datos de entrada inválidos', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class UnauthorizedAppError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenAppError extends AppError {
  constructor(message = 'Permisos insuficientes') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundAppError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictAppError extends AppError {
  constructor(message = 'Conflicto') {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitedAppError extends AppError {
  constructor(message = 'Demasiadas solicitudes') {
    super(message, 'RATE_LIMITED', 429);
  }
}

export class ExternalServiceAppError extends AppError {
  constructor(message = 'Error de servicio externo', details?: unknown) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
  }
}

export function generateRequestId(): string {
  try {
    // @ts-ignore
    return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function formatErrorResponse(error: unknown, requestId?: string) {
  const isDev = process.env.NODE_ENV === 'development';
  const traceId = requestId || generateRequestId();

  if (error instanceof AppError) {
    const body: any = {
      success: false,
      error: error.message,
      code: error.code,
      traceId,
    };
    if (error.details) body.details = error.details as any;
    if (isDev) body.stack = error.stack;
    const res = NextResponse.json(body, { status: error.status });
    res.headers.set('x-request-id', traceId);
    return res;
  }

  if (error instanceof Error) {
    const res = NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        traceId,
        ...(isDev ? { stack: error.stack } : {}),
      },
      { status: 500 }
    );
    res.headers.set('x-request-id', traceId);
    return res;
  }

  const res = NextResponse.json(
    {
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      traceId,
    },
    { status: 500 }
  );
  res.headers.set('x-request-id', traceId);
  return res;
}





