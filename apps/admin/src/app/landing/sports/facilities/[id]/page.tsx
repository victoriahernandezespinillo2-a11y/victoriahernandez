"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function ViewFacilityPage() {
  const params = useParams<{ id: string }>();
  const facilityId = (params?.id as unknown as string) || '';
  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!facilityId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/landing/sports/facilities/${facilityId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          showToast({ variant: 'error', title: 'No se pudo cargar', message: err?.error || 'Error obteniendo la instalación' });
          setFacility(null);
          return;
        }
        const data = await res.json();
        setFacility(data);
      } catch (e) {
        showToast({ variant: 'error', title: 'Error', message: 'No se pudo cargar la instalación' });
        setFacility(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [facilityId, showToast]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!facility) return <div className="p-6">No encontrado</div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Instalación: {facility.name}</h1>
        <Link href={`/landing/sports/facilities/${facility.id}/edit`} className="text-blue-600 hover:underline">Editar</Link>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Header con categoría */}
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${facility.category?.color || 'from-gray-500 to-gray-600'}`}>
            <i className={`${facility.category?.icon || 'fas fa-building'} text-white text-xl`}></i>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Categoría</div>
            <div className="font-medium text-gray-900">{facility.category?.name || 'Sin categoría'}</div>
          </div>
        </div>

        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-gray-600 text-sm">Descripción</div>
            <div className="text-gray-900 mt-1">{facility.description || '-'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Precio</div>
            <div className="text-gray-900 mt-1">{facility.price || '-'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Disponibilidad</div>
            <div className="text-gray-900 mt-1">{facility.availability || '-'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Rating</div>
            <div className="flex items-center space-x-1 mt-1">
              <i className="fas fa-star text-yellow-500 text-sm"></i>
              <span className="text-gray-900">
                {typeof facility.rating === 'string' ? parseFloat(facility.rating).toFixed(1) : facility.rating?.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Imagen si existe */}
        {facility.imageUrl && (
          <div>
            <div className="text-gray-600 text-sm mb-2">Imagen</div>
            <img 
              src={facility.imageUrl} 
              alt={facility.name}
              className="w-full max-w-md h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Características */}
        {facility.features && facility.features.length > 0 && (
          <div>
            <div className="text-gray-600 text-sm mb-2">Características</div>
            <div className="flex flex-wrap gap-2">
              {facility.features.map((feature: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Estado y orden */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-gray-600 text-sm">Estado</div>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                facility.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {facility.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Orden</div>
            <div className="text-gray-900 mt-1">{facility.order || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}









