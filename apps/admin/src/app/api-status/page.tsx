"use client";

import { useState, useEffect } from 'react';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { Badge } from '@repo/ui/badge';

interface ApiStatus {
  endpoint: string;
  status: 'loading' | 'success' | 'error';
  response?: any;
  error?: string;
}

export default function ApiStatusPage() {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const endpoints = [
    '/api/admin/centers',
    '/api/admin/products',
    '/api/admin/inventory/movements',
    '/api/health',
  ];

  const checkApiStatus = async (endpoint: string) => {
    const status: ApiStatus = {
      endpoint,
      status: 'loading',
    };

    setApiStatuses(prev => 
      prev.map(s => s.endpoint === endpoint ? status : s)
    );

    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let data;
      
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        throw new Error(`Invalid JSON: ${text.substring(0, 100)}...`);
      }

      setApiStatuses(prev => 
        prev.map(s => s.endpoint === endpoint ? {
          ...s,
          status: 'success',
          response: data
        } : s)
      );
    } catch (error) {
      setApiStatuses(prev => 
        prev.map(s => s.endpoint === endpoint ? {
          ...s,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        } : s)
      );
    }
  };

  const checkAllApis = async () => {
    setIsChecking(true);
    setApiStatuses(endpoints.map(endpoint => ({
      endpoint,
      status: 'loading'
    })));

    // Verificar todas las APIs en paralelo
    await Promise.all(endpoints.map(endpoint => checkApiStatus(endpoint)));
    setIsChecking(false);
  };

  useEffect(() => {
    checkAllApis();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'loading':
        return <Badge variant="secondary">Verificando...</Badge>;
      case 'success':
        return <Badge variant="default">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estado de las APIs</h1>
        <Button onClick={checkAllApis} disabled={isChecking}>
          {isChecking ? 'Verificando...' : 'Verificar Todas'}
        </Button>
      </div>

      <div className="grid gap-4">
        {apiStatuses.map((apiStatus) => (
          <Card key={apiStatus.endpoint} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold">{apiStatus.endpoint}</h3>
                {getStatusBadge(apiStatus.status)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkApiStatus(apiStatus.endpoint)}
                disabled={apiStatus.status === 'loading'}
              >
                Verificar
              </Button>
            </div>

            {apiStatus.status === 'success' && apiStatus.response && (
              <div className="mt-3 p-3 bg-green-50 rounded border">
                <h4 className="font-medium text-green-800 mb-2">Respuesta Exitosa:</h4>
                <pre className="text-sm text-green-700 overflow-x-auto">
                  {JSON.stringify(apiStatus.response, null, 2)}
                </pre>
              </div>
            )}

            {apiStatus.status === 'error' && apiStatus.error && (
              <div className="mt-3 p-3 bg-red-50 rounded border">
                <h4 className="font-medium text-red-800 mb-2">Error:</h4>
                <p className="text-sm text-red-700">{apiStatus.error}</p>
              </div>
            )}

            {apiStatus.status === 'loading' && (
              <div className="mt-3 p-3 bg-blue-50 rounded border">
                <p className="text-sm text-blue-700">Verificando API...</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3">Información de Diagnóstico</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Esta página verifica el estado de todas las APIs del sistema</p>
          <p>• Si alguna API falla, revisa la consola del navegador para más detalles</p>
          <p>• Asegúrate de que el servidor API esté ejecutándose en el puerto correcto</p>
          <p>• Verifica que las credenciales de autenticación sean válidas</p>
        </div>
      </Card>
    </div>
  );
}

