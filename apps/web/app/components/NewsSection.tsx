"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function NewsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [categoriesApi, setCategoriesApi] = useState<Array<{ id: string; name: string }>>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const router = useRouter();

  // Función para manejar suscripción al newsletter
  const handleNewsletterSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/landing/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('No se pudo suscribir');
      alert('¡Suscripción exitosa!');
      setEmail('');
    } catch (error) {
      alert('Error al suscribirse. Por favor intenta nuevamente.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Fallback icon/color map by slug
  const iconMap: Record<string, { icon: string; color: string; label?: string }> = {
    news: { icon: 'fas fa-newspaper', color: 'from-blue-500 to-indigo-600', label: 'Noticias' },
    events: { icon: 'fas fa-calendar-alt', color: 'from-purple-500 to-pink-600', label: 'Eventos' },
    tips: { icon: 'fas fa-lightbulb', color: 'from-yellow-500 to-orange-600', label: 'Consejos' },
    results: { icon: 'fas fa-trophy', color: 'from-green-500 to-emerald-600', label: 'Resultados' },
  };

  const categories = [
    { id: 'all', name: 'Todas', icon: 'fas fa-th-large', color: 'from-gray-500 to-gray-600' },
    ...categoriesApi.map((c) => ({
      id: c.id,
      name: c.name || iconMap[c.id]?.label || c.id,
      icon: iconMap[c.id]?.icon || 'fas fa-tag',
      color: iconMap[c.id]?.color || 'from-gray-400 to-gray-600',
    })),
  ];

  // Carga de posts desde API
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const query = activeCategory !== 'all' ? `&category=${encodeURIComponent(activeCategory)}` : '';
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const url = apiBase ? `${apiBase}/api/blog?limit=9${query}` : `/api/blog?limit=9${query}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudieron cargar las noticias');
        const json = await res.json();
        if (!cancelled) setPosts(json.posts || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error desconocido');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeCategory]);

  // Cargar categorías desde API
  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const url = apiBase ? `${apiBase}/api/blog/categories` : '/api/blog/categories';
        const res = await fetch(url);
        if (!res.ok) return; // mantener fallback
        const json = await res.json();
        const items = (json.categories || json || []).map((cat: any) => ({ id: cat.slug, name: cat.name }));
        if (!cancelled) setCategoriesApi(items);
      } catch {
        // ignorar y usar fallback
      }
    };
    loadCategories();
    return () => { cancelled = true; };
  }, []);

  // Transformar posts API → modelo de UI
  const mapPost = (p: any) => ({
    id: p.slug || p.id,
    category: p.categories?.[0]?.category?.slug || 'news',
    categoryName: p.categories?.[0]?.category?.name || 'Noticias',
    title: p.title,
    excerpt: p.excerpt,
    image: p.featuredImage || '/api/placeholder/400/250',
    author: p.author?.name || 'Equipo',
    authorRole: '',
    date: p.publishedAt || p.createdAt,
    readTime: p.readTime || '',
    tags: (p.tags || []).map((t: any) => t.tag?.name).filter(Boolean),
    featured: p.isFeatured,
    views: p.viewCount || 0,
    likes: 0,
  });

  const uiPosts = posts.map(mapPost);

  // Filtro por categoría activa
  const filtered = activeCategory === 'all'
    ? uiPosts
    : uiPosts.filter((p) => (p.category || '').toLowerCase() === activeCategory);

  const featuredNews = filtered.find((p) => p.featured) || filtered[0];
  const regularNews = filtered.filter((p) => !p.featured || p.id !== featuredNews?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 rounded-full px-6 py-2 mb-6">
            <i className="fas fa-newspaper text-blue-600"></i>
            <span className="font-semibold text-sm">Noticias & Blog</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            Mantente al día con
            <span className="gradient-text block">Nuestras Novedades</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Descubre las últimas noticias, eventos, consejos de entrenamiento y resultados 
            de competencias en nuestra comunidad deportiva.
          </p>
        </div>

        {/* Category Filter */}
        <div className={`flex flex-wrap justify-center mb-12 transition-all duration-1000 delay-200 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                  activeCategory === category.id
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className={category.icon}></i>
                <span className="hidden sm:inline">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Article */}
        {featuredNews && (
          <div className={`mb-16 transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Image */}
                <div className="relative h-64 lg:h-auto bg-gradient-to-br from-gray-200 to-gray-400">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <i className="fas fa-newspaper text-6xl text-white opacity-50"></i>
                  </div>
                  
                  {/* Featured Badge */}
                  <div className="absolute top-6 left-6">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-2">
                      <i className="fas fa-star"></i>
                      <span>Destacado</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="absolute bottom-6 right-6 flex space-x-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center space-x-1">
                      <i className="fas fa-eye text-gray-600 text-xs"></i>
                      <span className="text-xs font-semibold text-gray-900">{featuredNews.views}</span>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center space-x-1">
                      <i className="fas fa-heart text-red-500 text-xs"></i>
                      <span className="text-xs font-semibold text-gray-900">{featuredNews.likes}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 lg:p-12">
                  {/* Category & Date */}
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold capitalize">
                      {featuredNews.categoryName || featuredNews.category}
                    </span>
                    <span className="text-gray-500 text-sm">{formatDate(featuredNews.date)}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {featuredNews.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 leading-relaxed mb-6">
                    {featuredNews.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {(Array.isArray(featuredNews.tags) ? featuredNews.tags : []).map((tag: string, index: number) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Author & Read More */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <i className="fas fa-user text-white"></i>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{featuredNews.author}</div>
                        <div className="text-xs text-gray-500">{featuredNews.authorRole}</div>
                      </div>
                    </div>
                    
                    <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2">
                      <span>Leer Más</span>
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* News Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-1000 delay-600 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {regularNews.slice(0, 6).map((article, index) => (
            <article
              key={article.id}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden border border-gray-100"
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-400 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <i className={`${categories.find(c => c.id === article.category)?.icon || 'fas fa-newspaper'} text-4xl text-white opacity-50`}></i>
                </div>
                
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`bg-gradient-to-r ${categories.find(c => c.id === article.category)?.color || 'from-gray-400 to-gray-600'} text-white px-3 py-1 rounded-full text-xs font-semibold capitalize`}>
                    {article.category}
                  </span>
                </div>

                {/* Read Time */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
                  <span className="text-xs font-semibold text-gray-900">{article.readTime}</span>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button 
                    onClick={() => router.push(`/blog/${article.id}`)}
                    className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
                  >
                    Leer Artículo
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Date */}
                <div className="text-sm text-gray-500 mb-3">
                  {formatDate(article.date)}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors duration-300">
                  {article.title}
                </h3>

                {/* Excerpt */}
                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {article.excerpt}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-user text-white text-xs"></i>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-xs">{article.author}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-eye"></i>
                      <span>{article.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-heart"></i>
                      <span>{article.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-16 transition-all duration-1000 delay-800 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              ¿Quieres estar siempre informado?
            </h3>
            <p className="text-lg text-white/90 mb-6">
              Suscríbete a nuestro newsletter y recibe las últimas noticias directamente en tu email
            </p>
            
            <form onSubmit={handleNewsletterSubscription} className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 max-w-md mx-auto">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu email aquí..."
                required
                className="flex-1 px-4 py-3 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button 
                type="submit"
                disabled={isSubscribing}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubscribing ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    <span>Suscribiendo...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    <span>Suscribirse</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}