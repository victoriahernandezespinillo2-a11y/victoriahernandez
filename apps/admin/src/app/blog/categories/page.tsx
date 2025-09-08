"use client";

import { useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; color?: string | null; icon?: string | null; sortOrder?: number | null };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/categories?page=1&limit=100`, { credentials: "include" });
      const json = await res.json();
      if (res.ok && json?.success) setItems(json.data.items as Category[]);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name || !slug) return alert('Nombre y slug son requeridos');
    const res = await fetch('/api/admin/blog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name, slug }) });
    const json = await res.json();
    if (!res.ok || !json?.success) return alert(json?.error || 'Error');
    setName(""); setSlug("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar categoría?')) return;
    const res = await fetch(`/api/admin/blog/categories/${id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (!res.ok || !json?.success) return alert(json?.error || 'Error');
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Categorías</h1>
      <div className="bg-white border p-4 rounded-md grid grid-cols-1 md:grid-cols-3 gap-3">
        <input placeholder="Nombre" className="border rounded px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
        <input placeholder="Slug" className="border rounded px-3 py-2" value={slug} onChange={(e)=>setSlug(e.target.value)} />
        <button onClick={create} className="bg-blue-600 text-white rounded px-4 py-2">Crear</button>
      </div>
      {loading ? (
        <div className="text-gray-500">Cargando…</div>
      ) : (
        <div className="bg-white border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Nombre</th><th className="px-4 py-2 text-left">Slug</th><th className="px-4 py-2"/></tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.slug}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={()=>remove(c.id)} className="px-3 py-1 border rounded">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}









