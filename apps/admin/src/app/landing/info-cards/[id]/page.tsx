"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function ViewInfoCardPage() {
  const params = useParams<{ id: string }>();
  const cardId = (params?.id as unknown as string) || '';
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!cardId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/landing/info-cards/${cardId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          showToast({ variant: 'error', title: 'No se pudo cargar', message: err?.error || 'Error obteniendo la tarjeta' });
          setCard(null);
          return;
        }
        const data = await res.json();
        setCard(data);
      } catch (e) {
        showToast({ variant: 'error', title: 'Error', message: 'No se pudo cargar la tarjeta' });
        setCard(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cardId, showToast]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!card) return <div className="p-6">No encontrado</div>;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tarjeta: {card.title}</h1>
        <Link href={`/landing/info-cards/${card.id}/edit`} className="text-blue-600 hover:underline">Editar</Link>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Header con icono */}
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600">
            <i className={`${card.icon} text-white text-xl`}></i>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Título</div>
            <div className="font-medium text-gray-900">{card.title}</div>
          </div>
        </div>

        {/* Información básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-gray-600 text-sm">Descripción</div>
            <div className="text-gray-900 mt-1">{card.description || '-'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Estado</div>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                card.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {card.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div>
          <div className="text-gray-600 text-sm mb-2">Contenido</div>
          <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
            {card.content || '-'}
          </div>
        </div>

        {/* Orden */}
        <div>
          <div className="text-gray-600 text-sm">Orden</div>
          <div className="text-gray-900">{card.order || 0}</div>
        </div>
      </div>
    </div>
  );
}

















