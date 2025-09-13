"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from '@/components/ToastProvider';

type Post = { id: string; title: string; slug: string; content: string; excerpt?: string | null; status: string; publishedAt?: string | null };

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Post | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(`/api/admin/blog/posts/${id}`, { credentials: 'include', signal: controller.signal });
        const json = await res.json();
        if (res.ok && json?.success) {
          const p = json.data as Post;
          setForm({ ...p, publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0,16) : "" } as any);
        } else {
          throw new Error(json?.error || 'No encontrado');
        }
      } catch (e) {
        const errorMessage = (e as Error).message;
        if (errorMessage.includes('aborted')) {
          showToast({ variant: 'warning', title: 'Carga cancelada', message: 'La carga del post fue interrumpida' });
        } else {
          showToast({ variant: 'error', title: 'Error al cargar', message: errorMessage });
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
    return () => controller.abort();
  }, [id]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload: any = {
        title: form.title?.trim(),
        slug: form.slug?.trim(),
        content: form.content,
        excerpt: form.excerpt || undefined,
        status: form.status,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Error al guardar');
      showToast({ variant: 'success', title: 'Post actualizado', message: 'Los cambios se guardaron correctamente' });
      router.push('/blog/posts');
    } catch (e) {
      const errorMessage = (e as Error).message;
      showToast({ variant: 'error', title: 'Error al guardar', message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Cargando…</div>;
  if (!form) return <div className="p-6 text-gray-600">Post no encontrado</div>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Editar Post</h1>
      <div className="space-y-4 bg-white border border-gray-200 rounded-md p-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Título</label>
          <input 
            className="w-full border rounded px-3 py-2 text-gray-900" 
            value={form.title} 
            onChange={(e)=>setForm({ ...form, title: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Slug</label>
          <input 
            className="w-full border rounded px-3 py-2 text-gray-900" 
            value={form.slug} 
            onChange={(e)=>setForm({ ...form, slug: e.target.value })} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Contenido</label>
          <textarea 
            className="w-full border rounded px-3 py-2 h-40 text-gray-900" 
            value={form.content} 
            onChange={(e)=>setForm({ ...form, content: e.target.value })} 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Estado</label>
            <select 
              className="w-full border rounded px-3 py-2 text-gray-900" 
              value={form.status} 
              onChange={(e)=>setForm({ ...form, status: e.target.value })}
            >
              <option value="DRAFT">Borrador</option>
              <option value="SCHEDULED">Programado</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Publicación</label>
            <input 
              type="datetime-local" 
              className="w-full border rounded px-3 py-2 text-gray-900" 
              value={form.publishedAt || ""} 
              onChange={(e)=>setForm({ ...form, publishedAt: e.target.value })} 
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Extracto</label>
          <textarea 
            className="w-full border rounded px-3 py-2 text-gray-900" 
            value={form.excerpt || ""} 
            onChange={(e)=>setForm({ ...form, excerpt: e.target.value })} 
          />
        </div>
        <div className="flex justify-end gap-2">
          <button 
            onClick={()=>history.back()} 
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            disabled={saving} 
            onClick={handleSave} 
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
          >
            {saving?"Guardando…":"Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}













