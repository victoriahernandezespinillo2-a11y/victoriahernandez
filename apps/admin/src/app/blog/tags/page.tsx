"use client";

import { useEffect, useState } from "react";

type Tag = { id: string; name: string; slug: string; color?: string | null };

export default function TagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/tags?page=1&limit=100`, { credentials: "include" });
      const json = await res.json();
      if (res.ok && json?.success) setItems(json.data.items as Tag[]);
      else setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name || !slug) return alert('Nombre y slug son requeridos');
    const res = await fetch('/api/admin/blog/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name, slug }) });
    const json = await res.json();
    if (!res.ok || !json?.success) return alert(json?.error || 'Error');
    setName(""); setSlug(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar tag?')) return;
    const res = await fetch(`/api/admin/blog/tags/${id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (!res.ok || !json?.success) return alert(json?.error || 'Error');
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tags</h1>
      <div className="bg-white border p-4 rounded-md grid grid-cols-1 md:grid-cols-3 gap-3">
        <input placeholder="Nombre" className="border rounded px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
        <input placeholder="Slug" className="border rounded px-3 py-2" value={slug} onChange={(e)=>setSlug(e.target.value)} />
        <button onClick={create} className="bg-blue-600 text-white rounded px-4 py-2">Crear</button>
      </div>
      {loading ? (<div className="text-gray-500">Cargando…</div>) : (
        <div className="bg-white border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Nombre</th><th className="px-4 py-2 text-left">Slug</th><th className="px-4 py-2"/></tr></thead>
            <tbody>
              {items.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2">{t.name}</td>
                  <td className="px-4 py-2">{t.slug}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={()=>remove(t.id)} className="px-3 py-1 border rounded">Eliminar</button>
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









