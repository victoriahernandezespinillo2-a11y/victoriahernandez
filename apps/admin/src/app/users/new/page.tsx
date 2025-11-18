'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { UsersIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function NewUserPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'USER' | 'STAFF' | 'ADMIN'>('USER');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [membershipType, setMembershipType] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const isDateInFuture = useMemo(() => {
    if (!dateOfBirth) return false;
    const selected = new Date(dateOfBirth);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected.getTime() >= today.getTime();
  }, [dateOfBirth]);

  // Validación condicional: para USER no se requiere contraseña
  const isUserRole = role === 'USER';
  const passwordValid = isUserRole 
    ? true // No se valida contraseña para USER
    : password.length >= 8 && password === confirmPassword;

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    emailRegex.test(email) &&
    passwordValid &&
    gdprConsent &&
    !isDateInFuture;

  const onSubmit = async () => {
    try {
      setError(null);
      setLoading(true);
      await adminApi.users.create({ 
        firstName, 
        lastName, 
        email, 
        role, 
        phone,
        password: isUserRole ? undefined : password, // No enviar contraseña para USER
        dateOfBirth: dateOfBirth || undefined,
        membershipType: membershipType || undefined,
        gdprConsent,
        sendWelcomeEmail,
      });
      router.push('/users');
    } catch (e: any) {
      setError(e?.message || 'Error creando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <UsersIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Usuario</h1>
          <p className="text-gray-600">Crea un nuevo usuario del sistema</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Apellido"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {isDateInFuture && (
              <p className="mt-1 text-sm text-red-600">La fecha no puede ser futura.</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Necesario para calcular tarifas por edad.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="usuario@correo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+57..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Membresía</label>
            <select
              value={membershipType}
              onChange={(e) => setMembershipType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sin membresía</option>
              <option value="BASIC">Básica</option>
              <option value="PREMIUM">Premium</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USER">Usuario</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {!isUserRole && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    password.length > 0 && password.length < 8 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : password.length >= 8 
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                        : 'border-gray-300'
                  }`}
                  placeholder="Mínimo 8 caracteres"
                />
                {password.length > 0 && password.length < 8 && (
                  <p className="mt-1 text-sm text-red-600">La contraseña debe tener al menos 8 caracteres</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    confirmPassword.length > 0 && password !== confirmPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : confirmPassword.length > 0 && password === confirmPassword 
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                        : 'border-gray-300'
                  }`}
                  placeholder="Repite la contraseña"
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Las contraseñas no coinciden</p>
                )}
              </div>
            </>
          )}
          {isUserRole && (
            <div className="md:col-span-2">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Activación de cuenta por email</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Para usuarios con rol "Usuario", no se establece contraseña aquí por razones de privacidad y seguridad.</p>
                      <p className="mt-1">Se enviará automáticamente un enlace de activación al correo electrónico del usuario para que establezca su propia contraseña de forma segura.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="gdprConsent"
              type="checkbox"
              checked={gdprConsent}
              onChange={(e) => setGdprConsent(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="gdprConsent" className="text-sm text-gray-700">
              Confirmo que el usuario ha aceptado la política de privacidad y los términos del servicio (GDPR).
            </label>
          </div>
          {!gdprConsent && (
            <p className="text-sm text-red-600">Debes confirmar el consentimiento GDPR.</p>
          )}

          <div className="flex items-start gap-3">
            <input
              id="sendWelcomeEmail"
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="sendWelcomeEmail" className="text-sm text-gray-700">
              Enviar correo de bienvenida automáticamente.
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push('/users')}
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm font-semibold transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:bg-blue-100 disabled:text-blue-500 disabled:cursor-not-allowed disabled:hover:bg-blue-100 disabled:shadow-none"
          >
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}



























