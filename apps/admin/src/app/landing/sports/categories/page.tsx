"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description?: string;
  isActive: boolean;
  order: number;
  _count?: { facilities: number };
}

export default function CategoriesListPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/landing/sports/categories');
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const { confirm } = await import('@/components/ConfirmDialog');
    const ok = await confirm({
      title: 'Eliminar categoría',
      description: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      tone: 'danger',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/landing/sports/categories/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast({ variant: 'success', title: 'Categoría eliminada', message: 'Se eliminó correctamente.' });
      load();
    } else {
      const json = await res.json().catch(() => null);
      showToast({ variant: 'warning', title: 'No se puede eliminar', message: json?.error || 'No se pudo eliminar' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-gray-600">Gestiona las categorías de instalaciones deportivas</p>
        </div>
        <Link href="/landing/sports/categories/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Nueva Categoría</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Slug</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Orden</th>
              <th className="px-4 py-2 text-left">Instalaciones</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={6}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={6}>Sin categorías</td></tr>
            ) : (
              items.map(cat => (
                <tr key={cat.id} className="border-t">
                  <td className="px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${cat.color}`}><i className={`${cat.icon} text-white`}></i></div>
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{cat.slug}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{cat.isActive ? 'Activa' : 'Inactiva'}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{cat.order}</td>
                  <td className="px-4 py-2 text-gray-600">{cat._count?.facilities ?? '-'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Link href={`/landing/sports/categories/${cat.id}`} className="text-blue-600 hover:underline">Ver</Link>
                    <Link href={`/landing/sports/categories/${cat.id}/edit`} className="text-green-600 hover:underline">Editar</Link>
                    <button onClick={()=>remove(cat.id)} className="text-red-600 hover:underline">Eliminar</button>
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







