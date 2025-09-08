"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Facility {
  id: string;
  name: string;
  price: string;
  availability: string;
  rating: number;
  isActive: boolean;
  order: number;
  category: { id: string; name: string; icon: string; color: string };
}

export default function FacilitiesListPage() {
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/landing/sports/facilities');
      if (res.ok) {
        const data = await res.json();
        setItems(data.facilities || []);
      }
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta instalación?')) return;
    const res = await fetch(`/api/admin/landing/sports/facilities/${id}`, { method: 'DELETE' });
    if (res.ok) load(); else alert('No se pudo eliminar');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instalaciones</h1>
          <p className="text-gray-600">Gestiona las instalaciones deportivas</p>
        </div>
        <Link href="/landing/sports/facilities/new" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">Nueva Instalación</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">Instalación</th>
              <th className="px-4 py-2 text-left">Categoría</th>
              <th className="px-4 py-2 text-left">Precio</th>
              <th className="px-4 py-2 text-left">Disp.</th>
              <th className="px-4 py-2 text-left">Rating</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-6">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6">Sin instalaciones</td></tr>
            ) : (
              items.map(f => (
                <tr key={f.id} className="border-t">
                  <td className="px-4 py-2 font-medium text-gray-900">{f.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${f.category.color}`}><i className={`${f.category.icon} text-white`}></i></div>
                      <span className="text-gray-800">{f.category.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">{f.price}</td>
                  <td className="px-4 py-2 text-gray-700">{f.availability}</td>
                  <td className="px-4 py-2 text-gray-700">{typeof f.rating === 'string' ? parseFloat(f.rating as any).toFixed(1) : f.rating.toFixed(1)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{f.isActive ? 'Activa' : 'Inactiva'}</span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Link href={`/landing/sports/facilities/${f.id}`} className="text-blue-600 hover:underline">Ver</Link>
                    <Link href={`/landing/sports/facilities/${f.id}/edit`} className="text-green-600 hover:underline">Editar</Link>
                    <button onClick={()=>remove(f.id)} className="text-red-600 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



