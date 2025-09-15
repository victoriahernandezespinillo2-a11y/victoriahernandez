"use client";

import { useEffect, useState } from 'react';

export default function NewsletterPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/newsletter?search=${encodeURIComponent(search)}`);
    const json = await res.json();
    setItems(json.items || []);
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!subject || !html) return alert('Completa asunto y contenido');
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, html }) });
      const json = await res.json();
      if (res.ok) alert(`Enviados: ${json.sent}`); else alert(json.error || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Newsletter</h1>

      <div className="flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar email" className="border rounded px-3 py-2" />
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded">Buscar</button>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Alta</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.email}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Enviar campaña</h2>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" className="w-full border rounded px-3 py-2" />
        <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="HTML del mensaje" className="w-full h-40 border rounded px-3 py-2 font-mono" />
        <button onClick={send} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">{loading ? 'Enviando...' : 'Enviar a suscriptores'}</button>
      </div>
    </div>
  );
}











