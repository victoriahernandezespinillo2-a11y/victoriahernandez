"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    status: "DRAFT" as "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED",
    publishedAt: "",
    featuredImage: "",
    seoKeywords: "",
    seoDescription: "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        content: form.content,
        excerpt: form.excerpt || undefined,
        status: form.status,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      const res = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Error al crear");
      router.push("/blog/posts");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Nuevo Post</h1>
      <div className="space-y-4 bg-white border border-gray-200 rounded-md p-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Título</label>
          <input className="w-full border rounded px-3 py-2" value={form.title} onChange={(e)=>setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Slug</label>
          <input className="w-full border rounded px-3 py-2" value={form.slug} onChange={(e)=>setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Contenido</label>
          <textarea className="w-full border rounded px-3 py-2 h-40" value={form.content} onChange={(e)=>setForm({ ...form, content: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Estado</label>
            <select className="w-full border rounded px-3 py-2" value={form.status} onChange={(e)=>setForm({ ...form, status: e.target.value as any })}>
              <option value="DRAFT">Borrador</option>
              <option value="SCHEDULED">Programado</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Publicación</label>
            <input type="datetime-local" className="w-full border rounded px-3 py-2" value={form.publishedAt} onChange={(e)=>setForm({ ...form, publishedAt: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Extracto</label>
          <textarea className="w-full border rounded px-3 py-2" value={form.excerpt} onChange={(e)=>setForm({ ...form, excerpt: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Imagen destacada (URL)</label>
            <input className="w-full border rounded px-3 py-2" value={form.featuredImage} onChange={(e)=>setForm({ ...form, featuredImage: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">SEO Keywords</label>
            <input className="w-full border rounded px-3 py-2" value={form.seoKeywords} onChange={(e)=>setForm({ ...form, seoKeywords: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">SEO Descripción</label>
          <textarea className="w-full border rounded px-3 py-2" value={form.seoDescription} onChange={(e)=>setForm({ ...form, seoDescription: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={()=>history.back()} className="px-4 py-2 border rounded">Cancelar</button>
          <button disabled={saving} onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving?"Guardando…":"Guardar"}</button>
        </div>
      </div>
    </div>
  );
}




























