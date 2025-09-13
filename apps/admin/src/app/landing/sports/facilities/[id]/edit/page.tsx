"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function EditFacilityPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const facilityId = (params?.id as unknown as string) || '';
  const [form, setForm] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!facilityId) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar instalación y categorías en paralelo
        const [facilityRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/landing/sports/facilities/${facilityId}`),
          fetch('/api/admin/landing/sports/categories')
        ]);

        if (!facilityRes.ok) {
          const err = await facilityRes.json().catch(() => null);
          showToast({ variant: 'error', title: 'No se pudo cargar', message: err?.error || 'Error obteniendo la instalación' });
          setForm(null);
          return;
        }

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }

        const facilityData = await facilityRes.json();
        setForm(facilityData);
      } catch (e) {
        showToast({ variant: 'error', title: 'Error', message: 'No se pudo cargar la instalación' });
        setForm(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [facilityId, showToast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing/sports/facilities/${facilityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast({ variant: 'error', title: 'No se pudo actualizar', message: err?.error || 'Error al actualizar' });
        return;
      }
      
      showToast({ variant: 'success', title: 'Instalación actualizada', message: 'Los cambios fueron guardados.' });
      router.push(`/landing/sports/facilities/${facilityId}`);
    } catch (e) {
      showToast({ variant: 'error', title: 'Error', message: 'Error al actualizar la instalación' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!form) return <div className="p-6">No encontrado</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Editar Instalación</h1>
      
      <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nombre</label>
            <input 
              value={form.name || ''} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Categoría</label>
            <select 
              value={form.categoryId || ''} 
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })} 
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <textarea 
            value={form.description || ''} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
            className="w-full border rounded px-3 py-2" 
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Precio</label>
            <input 
              value={form.price || ''} 
              onChange={(e) => setForm({ ...form, price: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
              placeholder="Ej: $50.000/hora"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Disponibilidad</label>
            <input 
              value={form.availability || ''} 
              onChange={(e) => setForm({ ...form, availability: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
              placeholder="Ej: Lunes a Viernes 6:00-22:00"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Rating (0-5)</label>
            <input 
              type="number" 
              min="0" 
              max="5" 
              step="0.1"
              value={form.rating || 0} 
              onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} 
              className="w-full border rounded px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">URL de Imagen</label>
            <input 
              type="url"
              value={form.imageUrl || ''} 
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Características (separadas por comas)</label>
          <input 
            value={Array.isArray(form.features) ? form.features.join(', ') : ''} 
            onChange={(e) => setForm({ ...form, features: e.target.value.split(',').map(f => f.trim()).filter(f => f) })} 
            className="w-full border rounded px-3 py-2" 
            placeholder="Ej: Iluminación, Vestuarios, Estacionamiento"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="inline-flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={form.isActive || false} 
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
            />
            <span>Activa</span>
          </label>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Orden</label>
            <input 
              type="number" 
              value={form.order || 0} 
              onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} 
              className="w-24 border rounded px-3 py-2" 
            />
          </div>
        </div>

        <div className="pt-2">
          <button 
            disabled={saving} 
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
          >
            {saving ? 'Guardando...' : 'Actualizar Instalación'}
          </button>
        </div>
      </form>
    </div>
  );
}
