"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCategoryPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    icon: 'fas fa-dumbbell',
    color: 'from-emerald-500 to-blue-600',
    description: '',
    isActive: true,
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  const iconOptions = [
    { label: 'Fútbol', value: 'fas fa-futbol' },
    { label: 'Dumbbell', value: 'fas fa-dumbbell' },
    { label: 'Nadador', value: 'fas fa-swimmer' },
    { label: 'Tenis de mesa', value: 'fas fa-table-tennis' },
    { label: 'Trofeo', value: 'fas fa-trophy' },
    { label: 'Baloncesto', value: 'fas fa-basketball-ball' },
  ];

  const gradientOptions = [
    { label: 'Emerald → Blue', value: 'from-emerald-500 to-blue-600' },
    { label: 'Blue → Indigo', value: 'from-blue-500 to-indigo-600' },
    { label: 'Purple → Pink', value: 'from-purple-500 to-pink-600' },
    { label: 'Orange → Red', value: 'from-orange-500 to-red-600' },
    { label: 'Teal → Cyan', value: 'from-teal-500 to-cyan-600' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/landing/sports/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al crear categoría');
        return;
      }
      router.push('/landing/sports');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Nueva Categoría</h1>
      <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nombre</label>
          <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g,'-') })} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Slug</label>
          <input value={form.slug} onChange={(e)=>setForm({ ...form, slug: e.target.value })} className="w-full border rounded px-3 py-2" required />
        </div>
        {/* Icon Selector */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Icono</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {iconOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={()=>setForm({ ...form, icon: opt.value })}
                className={`border rounded-lg p-3 text-center hover:border-blue-500 transition-colors ${form.icon===opt.value ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200'}`}
              >
                <i className={`${opt.value} text-xl text-gray-700`}></i>
                <div className="text-xs mt-1 text-gray-600">{opt.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Previsualización: <i className={`${form.icon} text-blue-600`}></i></p>
        </div>

        {/* Gradient Selector */}
        <div>
          <label className="block text-sm text-gray-700 mb-2">Color (degradado)</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {gradientOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={()=>setForm({ ...form, color: opt.value })}
                className={`rounded-lg p-3 text-left border hover:border-emerald-500 transition-colors ${form.color===opt.value ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-gray-200'}`}
              >
                <div className={`h-8 rounded bg-gradient-to-r ${opt.value}`}></div>
                <div className="text-xs text-gray-600 mt-1">{opt.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-white text-xs bg-gradient-to-r ${form.color}`}>
              <i className={`${form.icon} mr-2`}></i> Vista previa
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3}></textarea>
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
          <button disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg">
            {saving ? 'Guardando...' : 'Crear Categoría'}
          </button>
        </div>
      </form>
    </div>
  );
}


