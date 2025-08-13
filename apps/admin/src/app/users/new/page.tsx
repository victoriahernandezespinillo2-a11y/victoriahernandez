'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { UsersIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function NewUserPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'USER' | 'STAFF' | 'ADMIN'>('USER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const canSubmit = firstName.trim().length >= 2 && emailRegex.test(email);

  const onSubmit = async () => {
    try {
      setError(null);
      setLoading(true);
      await adminApi.users.create({ firstName, lastName, email, role, phone });
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
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => router.push('/users')}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}







