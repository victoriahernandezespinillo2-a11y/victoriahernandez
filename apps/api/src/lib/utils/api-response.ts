import { NextResponse } from 'next/server';

export interface ApiResponseData {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  [key: string]: any;
}

export class ApiResponse {
  static success(data: any, message?: string): NextResponse {
    const response: ApiResponseData = {
      success: true,
      data,
      ...(message && { message })
    };
    
    return NextResponse.json(response, { status: 200 });
  }

  static created(data: any, message?: string): NextResponse {
    const response: ApiResponseData = {
      success: true,
      data,
      ...(message && { message })
    };
    
    return NextResponse.json(response, { status: 201 });
  }

  static badRequest(message: string = 'Solicitud incorrecta'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status: 400 });
  }

  static unauthorized(message: string = 'No autorizado'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status: 401 });
  }

  static forbidden(message: string = 'Acceso prohibido'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status: 403 });
  }

  static notFound(message: string = 'Recurso no encontrado'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status: 404 });
  }

  static conflict(message: string = 'Conflicto'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status: 409 });
  }

  static internalError(message: string = 'Error interno del servidor'): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status: 500 });
  }

  static custom(status: number, data: any, message?: string): NextResponse {
    const response: ApiResponseData = {
      success: status >= 200 && status < 300,
      ...(data && { data }),
      ...(message && { message }),
      ...(status >= 400 && { error: message || 'Error' })
    };
    
    return NextResponse.json(response, { status });
  }
}




