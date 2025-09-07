"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ViewCategoryPage() {
  const params = useParams<{ id: string }>();
  const categoryId = (params?.id as unknown as string) || '';
  const [cat, setCat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/landing/sports/categories/${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setCat(data.category);
      }
      setLoading(false);
    };
    load();
  }, [categoryId]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!cat) return <div className="p-6">No encontrado</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Categoría: {cat.name}</h1>
        <Link href={`/landing/sports/categories/${cat.id}/edit`} className="text-blue-600 hover:underline">Editar</Link>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg bg-gradient-to-r ${cat.color}`}><i className={`${cat.icon} text-white text-xl`}></i></div>
          <div>
            <div className="text-gray-600 text-sm">Slug</div>
            <div className="font-medium text-gray-900">{cat.slug}</div>
          </div>
        </div>
        <div>
          <div className="text-gray-600 text-sm">Descripción</div>
          <div className="text-gray-900">{cat.description || '-'}</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-gray-600 text-sm">Estado</div>
            <div><span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{cat.isActive ? 'Activa' : 'Inactiva'}</span></div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Orden</div>
            <div className="text-gray-900">{cat.order}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


