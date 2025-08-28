"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  FolderIcon,
  TagIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalCategories: number;
  totalTags: number;
  totalComments: number;
  pendingComments: number;
}

interface RecentPost {
  id: string;
  title: string;
  status: string;
  publishedAt: string | null;
  author: {
    name: string;
  };
  _count: {
    comments: number;
  };
}

export default function BlogDashboard() {
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogData();
  }, []);

  const fetchBlogData = async () => {
    try {
      // En un entorno real, harías llamadas a las APIs
      // Por ahora, simulamos datos
      setStats({
        totalPosts: 4,
        publishedPosts: 3,
        draftPosts: 1,
        totalCategories: 5,
        totalTags: 8,
        totalComments: 12,
        pendingComments: 3,
      });

      setRecentPosts([
        {
          id: '1',
          title: 'Nueva Cancha de Tenis Inaugurada con Tecnología LED',
          status: 'PUBLISHED',
          publishedAt: '2024-01-15T10:00:00Z',
          author: { name: 'Administrador' },
          _count: { comments: 5 },
        },
        {
          id: '2',
          title: 'Torneo de Fútbol 7 - Inscripciones Abiertas',
          status: 'PUBLISHED',
          publishedAt: '2024-01-12T14:30:00Z',
          author: { name: 'Administrador' },
          _count: { comments: 3 },
        },
        {
          id: '3',
          title: '5 Ejercicios Esenciales para Mejorar tu Rendimiento',
          status: 'PUBLISHED',
          publishedAt: '2024-01-10T09:15:00Z',
          author: { name: 'Administrador' },
          _count: { comments: 2 },
        },
      ]);
    } catch (error) {
      console.error('Error fetching blog data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No publicado';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Gestiona el contenido del blog del polideportivo
          </p>
        </div>
        <Link
          href="/blog/posts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nuevo Post</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Posts</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalPosts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FolderIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalCategories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TagIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tags</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalTags}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Comentarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalComments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/blog/posts"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">Gestionar Posts</h3>
              <p className="text-sm text-gray-600">Crear y editar artículos</p>
            </div>
          </div>
        </Link>

        <Link
          href="/blog/categories"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <FolderIcon className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-medium text-gray-900">Categorías</h3>
              <p className="text-sm text-gray-600">Organizar contenido</p>
            </div>
          </div>
        </Link>

        <Link
          href="/blog/tags"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <TagIcon className="h-6 w-6 text-purple-600" />
            <div>
              <h3 className="font-medium text-gray-900">Tags</h3>
              <p className="text-sm text-gray-600">Etiquetas y palabras clave</p>
            </div>
          </div>
        </Link>

        <Link
          href="/blog/comments"
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="font-medium text-gray-900">Comentarios</h3>
              <p className="text-sm text-gray-600">Moderar feedback</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Posts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Posts Recientes</h2>
        </div>
        <div className="p-6">
          {recentPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay posts recientes</p>
          ) : (
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{post.title}</h3>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>{post.author.name}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        <span>{post._count.comments} comentarios</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        post.status
                      )}`}
                    >
                      {post.status === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                    </span>
                    <div className="flex space-x-1">
                      <Link
                        href={`/blog/posts/${post.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/blog/posts/${post.id}/edit`}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


