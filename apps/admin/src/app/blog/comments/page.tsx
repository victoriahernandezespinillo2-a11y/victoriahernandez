"use client";

import { useEffect, useState } from "react";

type Comment = { id: string; postId: string; authorName: string; authorEmail: string; content: string; status: 'PENDING'|'APPROVED'|'HIDDEN'|'SPAM'; createdAt: string };

export default function CommentsPage() {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('PENDING');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/blog/comments?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json?.success) setItems(json.data.items as Comment[]); else setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const moderate = async (id: string, newStatus: Comment['status']) => {
    const res = await fetch(`/api/admin/blog/comments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: newStatus }) });
    const json = await res.json();
    if (!res.ok || !json?.success) return alert(json?.error || 'Error');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar comentario?')) return;
    const res = await fetch(`/api/admin/blog/comments/${id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (!res.ok || !json?.success) return alert(json?.error || 'Error');
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Comentarios</h1>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="border rounded px-3 py-2">
          <option value="PENDING">Pendientes</option>
          <option value="APPROVED">Aprobados</option>
          <option value="HIDDEN">Ocultos</option>
          <option value="SPAM">Spam</option>
        </select>
      </div>
      {loading ? (<div className="text-gray-500">Cargando…</div>) : items.length === 0 ? (
        <div className="text-gray-500">Sin comentarios.</div>
      ) : (
        <div className="bg-white border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Autor</th><th className="px-4 py-2 text-left">Contenido</th><th className="px-4 py-2"/></tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.authorName} <span className="text-gray-500">({c.authorEmail})</span></td>
                  <td className="px-4 py-2">{c.content}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {c.status !== 'APPROVED' && <button onClick={()=>moderate(c.id,'APPROVED')} className="px-3 py-1 border rounded">Aprobar</button>}
                    {c.status !== 'HIDDEN' && <button onClick={()=>moderate(c.id,'HIDDEN')} className="px-3 py-1 border rounded">Ocultar</button>}
                    {c.status !== 'SPAM' && <button onClick={()=>moderate(c.id,'SPAM')} className="px-3 py-1 border rounded">Spam</button>}
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






