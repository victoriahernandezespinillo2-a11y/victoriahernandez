'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  CreditCard,
  XCircle,
} from 'lucide-react';
import { useUserProfile } from '@/lib/hooks';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  membershipType?: string;
  memberSince?: string;
  image?: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { profile: userProfile, loading, error, updateProfile, getProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({} as UserProfile);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar perfil al montar el componente
  useEffect(() => {
    getProfile().catch((e) => {
      console.error('Error cargando perfil:', e);
    });
  }, [getProfile]);

  // Actualizar formData cuando se carga el perfil
  useEffect(() => {
    if (userProfile) {
      // Normalizar dateOfBirth para el input type="date" (YYYY-MM-DD)
      const normalizedDob = (() => {
        const dob = (userProfile as any).dateOfBirth;
        if (!dob) return undefined;
        try {
          const d = new Date(dob);
          if (isNaN(d.getTime())) return undefined;
          return d.toISOString().slice(0, 10);
        } catch {
          return undefined;
        }
      })();

      setFormData({
        ...(userProfile as any),
        dateOfBirth: normalizedDob,
      } as UserProfile);
    }
  }, [userProfile]);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(userProfile || {} as UserProfile);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Enviar solo los campos soportados por el backend y con el formato adecuado
      const payload: Partial<UserProfile> = {
        firstName: (formData.firstName || '').trim() || undefined,
        lastName: (formData.lastName || '').trim() || undefined,
        phone: (formData.phone || '').trim() || undefined,
        // Convertir "YYYY-MM-DD" a ISO string aceptada por Zod .datetime()
        dateOfBirth: formData.dateOfBirth
          ? new Date(`${formData.dateOfBirth}T00:00:00Z`).toISOString()
          : undefined,
      };

      await updateProfile(payload);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error al actualizar el perfil. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error al cargar el perfil
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profile = userProfile || ({} as UserProfile);
  const displayName = ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim();
  const memberSinceRaw = profile.memberSince || (profile as any).createdAt || '';
  const memberSinceLabel = (() => {
    if (!memberSinceRaw) return null;
    try {
      const d = new Date(memberSinceRaw);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {profile.image ? (
                  <img
                    src={profile.image}
                    alt={profile.name || 'Usuario'}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-10 w-10 text-blue-600" />
                  </div>
                )}
                <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {displayName || profile.name || 'Usuario'}
                </h1>
                <p className="text-gray-500">{profile.email}</p>
                <div className="flex items-center mt-2 space-x-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.membershipType || 'Básico'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {memberSinceLabel ? (
                      <>Miembro desde {memberSinceLabel}</>
                    ) : (
                      <>Miembro desde —</>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar Perfil
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Información Personal
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.firstName || 'No especificado'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.lastName || 'No especificado'}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Correo Electrónico
              </label>
              <p className="text-gray-900">{profile.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                El correo electrónico no se puede cambiar
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Teléfono
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="+57 300 123 4567"
                />
              ) : (
                <p className="text-gray-900">{profile.phone || 'No especificado'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Fecha de Nacimiento
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  lang="es-ES"
                  data-locale="es-ES"
                />
              ) : (
                <p className="text-gray-900">
                  {profile.dateOfBirth 
                    ? new Date(profile.dateOfBirth).toLocaleDateString('es-ES')
                    : 'No especificado'
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact & Emergency Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-green-600" />
              Información de Contacto
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Calle 123 #45-67"
                />
              ) : (
                <p className="text-gray-900">{profile.address || 'No especificado'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Victoria Hernández"
                />
              ) : (
                <p className="text-gray-900">{profile.city || 'No especificado'}</p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Contacto de Emergencia
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Contacto
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.emergencyContact || ''}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="Nombre completo"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.emergencyContact || 'No especificado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono de Emergencia
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.emergencyPhone || ''}
                      onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                      placeholder="+57 300 123 4567"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.emergencyPhone || 'No especificado'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
            Información de Membresía
          </h2>
        </div>
        <div className="p-6 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userProfile?.membershipType || 'Básica'}
              </div>
              <div className="text-sm text-gray-500">Tipo de Membresía</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : (userProfile?.creditsBalance || 0)}
              </div>
              <div className="text-sm text-gray-500">Créditos Disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {userProfile?._count?.reservations || 0}
              </div>
              <div className="text-sm text-gray-500">Reservas Totales</div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <a
              href="/dashboard/memberships"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Gestionar Membresía
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}