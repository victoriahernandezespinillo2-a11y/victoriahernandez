'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, Shield } from 'lucide-react';

const setPasswordSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema as any),
  });

  const password = watch('password');

  // Validar token al cargar
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token de activación no proporcionado');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/set-password?token=${token}`, {
          method: 'GET',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Token inválido o expirado');
        }

        if (result.data?.valid) {
          setTokenValid(true);
          setUserEmail(result.data.email || null);
        } else {
          throw new Error('Token inválido');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error validando token');
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: SetPasswordFormData) => {
    if (!token) {
      setError('Token de activación no proporcionado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al establecer la contraseña');
      }

      setSuccess(true);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/auth/signin?activated=true');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  // Validar fortaleza de contraseña en tiempo real
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: 'Débil', color: 'bg-red-500' };
    if (strength <= 4) return { strength, label: 'Media', color: 'bg-yellow-500' };
    return { strength, label: 'Fuerte', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password || '');

  if (isValidating) {
    return (
      <div className="w-full text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Validando enlace de activación...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="w-full text-center">
        <div className="mb-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Enlace Inválido o Expirado
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'El enlace de activación no es válido o ha expirado.'}
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>¿Qué puedes hacer?</strong>
            </p>
            <ul className="text-yellow-700 text-sm mt-2 text-left list-disc list-inside space-y-1">
              <li>Contacta al administrador para solicitar un nuevo enlace de activación</li>
              <li>Si ya tienes una cuenta, intenta iniciar sesión</li>
              <li>Usa la opción "Olvidé mi contraseña" si ya activaste tu cuenta</li>
            </ul>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 transition-colors"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full text-center">
        <div className="mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Cuenta Activada!
          </h2>
          <p className="text-gray-600 mb-6">
            Tu contraseña ha sido establecida exitosamente. Tu cuenta está ahora activa y lista para usar.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-sm">
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/auth/signin?activated=true"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Ir al inicio de sesión ahora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Establecer Contraseña
        </h2>
        <p className="text-gray-600">
          {userEmail && (
            <>
              Completa la activación de tu cuenta <strong>{userEmail}</strong>
            </>
          )}
          {!userEmail && 'Establece una contraseña segura para activar tu cuenta'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 text-sm font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Set Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Nueva Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
          
          {/* Password Strength Indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength.strength <= 2 ? 'text-red-600' :
                  passwordStrength.strength <= 4 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p className={password.length >= 8 ? 'text-green-600 font-medium' : ''}>
                  {password.length >= 8 ? '✓' : '○'} Al menos 8 caracteres (requerido)
                </p>
                <p className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} Una letra mayúscula (recomendado)
                </p>
                <p className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[a-z]/.test(password) ? '✓' : '○'} Una letra minúscula (recomendado)
                </p>
                <p className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[0-9]/.test(password) ? '✓' : '○'} Un número (recomendado)
                </p>
                <p className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} Un carácter especial (recomendado)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirmar Contraseña
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Repite la contraseña"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>🔒 Seguridad:</strong> Esta contraseña será tu única forma de acceder a tu cuenta. 
            Elige una contraseña segura y no la compartas con nadie.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Estableciendo contraseña...
            </div>
          ) : (
            'Activar Cuenta y Establecer Contraseña'
          )}
        </button>
      </form>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">¿Necesitas ayuda?</h3>
        <p className="text-sm text-gray-600">
          Si tienes problemas para activar tu cuenta, contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}

