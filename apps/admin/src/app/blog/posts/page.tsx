"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusIcon, PencilIcon, EyeIcon } from "@heroicons/react/24/outline";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";
  publishedAt?: string | null;
};

export default function BlogPostsPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "10" });
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/blog/posts?${params}`, { credentials: "include", signal: controller.signal });
        const json = await res.json();
        if (res.ok && json?.success) {
          setPosts(json.data.items as Post[]);
          setPages(json.data.pagination.pages);
        } else {
          setPosts([]);
          setPages(1);
        }
      } catch {
        setPosts([]);
        setPages(1);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [page, search]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <Link href="/blog/posts/new" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" /> Nuevo Post
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-3">
        <input
          placeholder="Buscar por título o excerpt..."
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-gray-500">Cargando…</div>
      ) : posts.length === 0 ? (
        <div className="text-gray-500">No hay posts.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Título</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Publicado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{p.title}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800">{p.status}</span>
                  </td>
                  <td className="px-4 py-2">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("es-ES") : "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex gap-2">
                      <Link href={`/blog/posts/${p.id}/edit`} className="p-2 text-gray-500 hover:text-green-600" title="Editar">
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <Link href={`/blog/posts/${p.slug}`} className="p-2 text-gray-500 hover:text-blue-600" title="Ver">
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button disabled={page===1} onClick={() => setPage((p)=>Math.max(1,p-1))} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
          <span className="text-sm text-gray-600">Página {page} de {pages}</span>
          <button disabled={page===pages} onClick={() => setPage((p)=>Math.min(pages,p+1))} className="px-3 py-1 border rounded disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  );
}


