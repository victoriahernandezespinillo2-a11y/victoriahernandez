import { useState, useEffect } from 'react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: string;
  type: string;
  publishedAt: string | null;
  isFeatured: boolean;
  featuredImage: string | null;
  viewCount: number;
  author: {
    id: string;
    name: string;
  };
  categories: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
      icon: string | null;
    };
  }>;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
    };
  }>;
  _count: {
    comments: number;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  _count: {
    posts: number;
  };
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  _count: {
    posts: number;
  };
}

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface BlogFilters {
  status?: string;
  type?: string;
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}

export function useBlogPosts(filters: BlogFilters = {}) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pagination, setPagination] = useState<BlogResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.featured) params.append('featured', 'true');

      const response = await fetch(`/api/blog?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar los posts');
      }

      const data: BlogResponse = await response.json();
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { posts, pagination, loading, error, refetch: fetchPosts };
}

export function useBlogPost(slug: string) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/blog/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Post no encontrado');
        }
        throw new Error('Error al cargar el post');
      }

      const data: BlogPost = await response.json();
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { post, loading, error, refetch: fetchPost };
}

export function useBlogCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/blog/categories');
      
      if (!response.ok) {
        throw new Error('Error al cargar las categorías');
      }

      const data: Category[] = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading, error, refetch: fetchCategories };
}

export function useBlogTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/blog/tags');
      
      if (!response.ok) {
        throw new Error('Error al cargar los tags');
      }

      const data: Tag[] = await response.json();
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { tags, loading, error, refetch: fetchTags };
}

export function useFeaturedPosts() {
  return useBlogPosts({ featured: true, limit: 3 });
}

export function useRecentPosts(limit: number = 5) {
  return useBlogPosts({ limit });
}

export function useCategoryPosts(categorySlug: string) {
  return useBlogPosts({ category: categorySlug });
}

export function useTagPosts(tagSlug: string) {
  return useBlogPosts({ tag: tagSlug });
}


