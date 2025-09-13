"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useRouter, useParams } from 'next/navigation';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const categoryId = (params?.id as unknown as string) || '';
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!categoryId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/landing/sports/categories/${categoryId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          showToast({ variant: 'error', title: 'No se pudo cargar', message: err?.error || 'Error obteniendo la categoría' });
          setForm(null);
          return;
        }
        const data = await res.json();
        setForm(data);
      } catch (e) {
        showToast({ variant: 'error', title: 'Error', message: 'No se pudo cargar la categoría' });
        setForm(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [categoryId, showToast]);

  const checkSlug = async (slug: string) => {
    setSlugError(null);
    const res = await fetch('/api/admin/landing/sports/categories');
    if (res.ok) {
      const items = await res.json();
      const duplicate = items.find((c: any) => c.slug === slug && c.id !== categoryId);
      if (duplicate) setSlugError('Este slug ya está en uso');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugError) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing/sports/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast({ variant: 'error', title: 'No se pudo actualizar', message: err.error || 'Error al actualizar' });
        return;
      }
      showToast({ variant: 'success', title: 'Categoría actualizada', message: 'Los cambios fueron guardados.' });
      router.push(`/landing/sports/categories/${categoryId}`);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!form) return <div className="p-6">No encontrado</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Editar Categoría</h1>
      <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nombre</label>
          <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Slug</label>
          <input value={form.slug} onChange={(e)=>{ setForm({ ...form, slug: e.target.value }); checkSlug(e.target.value); }} className="w-full border rounded px-3 py-2" required />
          {slugError && <p className="text-red-600 text-xs mt-1">{slugError}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Icono</label>
            <input value={form.icon} onChange={(e)=>setForm({ ...form, icon: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Color (degradado)</label>
            <input value={form.color} onChange={(e)=>setForm({ ...form, color: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <textarea value={form.description || ''} onChange={(e)=>setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3}></textarea>
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
          <button disabled={saving || !!slugError} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg">
            {saving ? 'Guardando...' : 'Actualizar Categoría'}
          </button>
        </div>
      </form>
    </div>
  );
}


