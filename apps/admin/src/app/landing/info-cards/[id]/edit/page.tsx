"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

export default function EditInfoCardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cardId = (params?.id as unknown as string) || '';
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!cardId) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/landing/info-cards/${cardId}`);
        
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          showToast({ variant: 'error', title: 'No se pudo cargar', message: err?.error || 'Error obteniendo la tarjeta' });
          setForm(null);
          return;
        }

        const data = await res.json();
        setForm(data);
      } catch (e) {
        showToast({ variant: 'error', title: 'Error', message: 'No se pudo cargar la tarjeta' });
        setForm(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [cardId, showToast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing/info-cards/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast({ variant: 'error', title: 'No se pudo actualizar', message: err?.error || 'Error al actualizar' });
        return;
      }
      
      showToast({ variant: 'success', title: 'Tarjeta actualizada', message: 'Los cambios fueron guardados.' });
      router.push(`/landing/info-cards/${cardId}`);
    } catch (e) {
      showToast({ variant: 'error', title: 'Error', message: 'Error al actualizar la tarjeta' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!form) return <div className="p-6">No encontrado</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Editar Tarjeta de Información</h1>
      
      <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Título</label>
            <input 
              value={form.title || ''} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Icono (FontAwesome)</label>
            <input 
              value={form.icon || ''} 
              onChange={(e) => setForm({ ...form, icon: e.target.value })} 
              className="w-full border rounded px-3 py-2" 
              placeholder="fas fa-info-circle"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <input 
            value={form.description || ''} 
            onChange={(e) => setForm({ ...form, description: e.target.value })} 
            className="w-full border rounded px-3 py-2" 
            placeholder="Breve descripción de la tarjeta"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Contenido</label>
          <textarea 
            value={form.content || ''} 
            onChange={(e) => setForm({ ...form, content: e.target.value })} 
            className="w-full border rounded px-3 py-2" 
            rows={6}
            placeholder="Contenido detallado de la tarjeta..."
            required
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
            {saving ? 'Guardando...' : 'Actualizar Tarjeta'}
          </button>
        </div>
      </form>
    </div>
  );
}


























