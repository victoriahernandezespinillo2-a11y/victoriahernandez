"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category { id: string; name: string; }

export default function NewFacilityPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    imageUrl: '',
    price: '€10/h',
    availability: 'Disponible',
    rating: 4.8,
    features: '' as any,
    isActive: true,
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/landing/sports/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    };
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        rating: Number(form.rating) || 0,
        features: typeof form.features === 'string' ? String(form.features).split('\n').filter(Boolean) : form.features,
        imageUrl: form.imageUrl || undefined,
      };
      const res = await fetch('/api/admin/landing/sports/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al crear instalación');
        return;
      }
      router.push('/landing/sports');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Nueva Instalación</h1>
      <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Categoría</label>
          <select value={form.categoryId} onChange={(e)=>setForm({ ...form, categoryId: e.target.value })} className="w-full border rounded px-3 py-2" required>
            <option value="">Selecciona una categoría</option>
            {categories.map(c=> (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nombre</label>
          <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} required></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Imagen (URL)</label>
            <input value={form.imageUrl} onChange={(e)=>setForm({ ...form, imageUrl: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Precio</label>
            <input value={form.price} onChange={(e)=>setForm({ ...form, price: e.target.value })} className="w-full border rounded px-3 py-2" required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Disponibilidad</label>
            <input value={form.availability} onChange={(e)=>setForm({ ...form, availability: e.target.value })} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Rating</label>
            <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e)=>setForm({ ...form, rating: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Características (una por línea)</label>
          <textarea value={form.features} onChange={(e)=>setForm({ ...form, features: e.target.value })} className="w-full border rounded px-3 py-2" rows={4}></textarea>
        </div>
        <div className="flex items-center space-x-4">
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={form.isActive} onChange={(e)=>setForm({ ...form, isActive: e.target.checked })} />
            <span>Activa</span>
          </label>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Orden</label>
            <input type="number" value={form.order} onChange={(e)=>setForm({ ...form, order: parseInt(e.target.value)||0 })} className="w-24 border rounded px-3 py-2" />
          </div>
        </div>
        <div className="pt-2">
          <button disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg">
            {saving ? 'Guardando...' : 'Crear Instalación'}
          </button>
        </div>
      </form>
    </div>
  );
}


