"use client";

import { useState, useEffect } from 'react';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { Badge } from '@repo/ui/badge';
import { toast } from 'sonner';

interface AuthStatus {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
  session?: any;
  error?: string;
}

export default function AuthStatusPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkAuthStatus = async () => {
    setIsChecking(true);
    try {
      // Verificar sesión actual
      const sessionResponse = await fetch('/api/auth/session', { 
        credentials: 'include' 
      });
      
      if (!sessionResponse.ok) {
        throw new Error(`Error de sesión: ${sessionResponse.status}`);
      }

      const sessionData = await sessionResponse.json();
      console.log('Session data:', sessionData);

      if (sessionData.user) {
        // Verificar permisos de admin
        const adminTestResponse = await fetch('/api/admin/dashboard', { 
          credentials: 'include' 
        });

        if (adminTestResponse.ok) {
          setAuthStatus({
            isAuthenticated: true,
            user: {
              id: sessionData.user.id || 'N/A',
              email: sessionData.user.email || 'N/A',
              role: sessionData.user.role || 'N/A',
              name: sessionData.user.name || 'N/A'
            },
            session: sessionData
          });
          toast.success('Autenticación exitosa con permisos de admin');
        } else {
          setAuthStatus({
            isAuthenticated: true,
            user: {
              id: sessionData.user.id || 'N/A',
              email: sessionData.user.email || 'N/A',
              role: sessionData.user.role || 'N/A',
              name: sessionData.user.name || 'N/A'
            },
            session: sessionData,
            error: `Usuario autenticado pero sin permisos de admin (${adminTestResponse.status})`
          });
          toast.error('Usuario sin permisos de administrador');
        }
      } else {
        setAuthStatus({
          isAuthenticated: false,
          error: 'No hay sesión activa'
        });
        toast.error('No hay sesión activa');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      toast.error('Error verificando autenticación');
    } finally {
      setIsChecking(false);
    }
  };

  const forceSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setAuthStatus({ isAuthenticated: false });
        toast.success('Sesión cerrada exitosamente');
        // Redirigir a login
        window.location.href = '/auth/signin';
      } else {
        toast.error('Error cerrando sesión');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error cerrando sesión');
    }
  };

  const clearAllCookies = () => {
    try {
      // Limpiar cookies específicas de NextAuth
      const cookieNames = [
        'next-auth.session-token',
        'next-auth.session-token-admin',
        '__Secure-next-auth.session-token',
        'authjs.session-token',
        'next-auth.csrf-token',
        'next-auth.callback-url'
      ];
      
      cookieNames.forEach(name => {
        // Limpiar para todos los puertos posibles
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost:3001`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost:3002`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost:3003`;
      });
      
      // Limpiar localStorage y sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success('Cookies y sesiones limpiadas');
      
      // Recargar la página para aplicar cambios
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing cookies:', error);
      toast.error('Error limpiando cookies');
    }
  };

  const switchToWebApp = () => {
    // Redirigir a la web app y cerrar sesión aquí
    window.open('http://localhost:3001', '_blank');
    forceSignOut();
  };

  const testAdminEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      const status = response.ok ? 'success' : 'error';
      const message = response.ok ? 'OK' : `HTTP ${response.status}`;
      
      toast[status === 'success' ? 'success' : 'error'](`${endpoint}: ${message}`);
      
      return { endpoint, status, message };
    } catch (error) {
      toast.error(`${endpoint}: Error de conexión`);
      return { endpoint, status: 'error', message: 'Error de conexión' };
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estado de Autenticación</h1>
        <div className="flex space-x-2">
          <Button onClick={checkAuthStatus} disabled={isChecking}>
            {isChecking ? 'Verificando...' : 'Verificar Estado'}
          </Button>
          {authStatus.isAuthenticated && (
            <Button variant="outline" onClick={forceSignOut}>
              Cerrar Sesión
            </Button>
          )}
          <Button variant="destructive" onClick={clearAllCookies}>
            🧹 Limpiar Cookies
          </Button>
          <Button variant="outline" onClick={switchToWebApp}>
            🌐 Ir a Web App
          </Button>
        </div>
      </div>

      {/* Estado de Autenticación */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Estado Actual</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="font-medium">Autenticado:</span>
            <Badge variant={authStatus.isAuthenticated ? 'default' : 'destructive'}>
              {authStatus.isAuthenticated ? 'SÍ' : 'NO'}
            </Badge>
          </div>
          
          {authStatus.user && (
            <>
              <div className="flex items-center space-x-3">
                <span className="font-medium">Usuario:</span>
                <span className="text-gray-700">{authStatus.user.name || authStatus.user.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium">Email:</span>
                <span className="text-gray-700">{authStatus.user.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium">Rol:</span>
                <Badge variant={authStatus.user.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {authStatus.user.role}
                </Badge>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium">ID:</span>
                <span className="text-gray-700 font-mono text-sm">{authStatus.user.id}</span>
              </div>
            </>
          )}

          {authStatus.error && (
            <div className="p-3 bg-red-50 rounded border">
              <span className="font-medium text-red-800">Error:</span>
              <span className="text-red-700 ml-2">{authStatus.error}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Pruebas de Endpoints Admin */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pruebas de Endpoints Admin</h2>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            onClick={() => testAdminEndpoint('/api/admin/dashboard')}
          >
            Probar Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => testAdminEndpoint('/api/admin/users')}
          >
            Probar Users
          </Button>
          <Button 
            variant="outline" 
            onClick={() => testAdminEndpoint('/api/admin/centers')}
          >
            Probar Centers
          </Button>
          <Button 
            variant="outline" 
            onClick={() => testAdminEndpoint('/api/admin/products')}
          >
            Probar Products
          </Button>
        </div>
      </Card>

      {/* Información de Solución */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Solución de Problemas</h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p><strong>Si no estás autenticado:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Ve a <code className="bg-gray-100 px-1 rounded">/auth/signin</code> para iniciar sesión</li>
            <li>Verifica que tengas credenciales válidas</li>
          </ul>
          
          <p><strong>Si estás autenticado pero sin permisos:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Tu cuenta no tiene rol de ADMIN</li>
            <li>Contacta al administrador del sistema</li>
            <li>Verifica que tu rol esté configurado correctamente en la base de datos</li>
          </ul>
          
          <p><strong>Si hay errores de sesión:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>La sesión puede haber expirado</li>
            <li>Intenta cerrar sesión y volver a iniciar</li>
            <li>Verifica que las cookies estén habilitadas</li>
          </ul>
        </div>
      </Card>

      {/* Datos de Sesión (Debug) */}
      {authStatus.session && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Datos de Sesión (Debug)</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
            {JSON.stringify(authStatus.session, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
