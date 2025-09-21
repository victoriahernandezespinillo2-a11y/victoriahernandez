'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCart } from '@/lib/contexts/CartContext';
import CartIcon from '@/components/CartIcon';
import {
  Search,
  Filter,
  ShoppingBag,
  Star,
  Truck,
  Shield,
  Award,
  Heart,
  ShoppingCart,
  Plus,
  Sparkles,
  Tag,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';

export default function ShopPage() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { state, addToCart } = useCart();
  const { itemCount } = state;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.shop.list({ page: 1, limit: 24 });
        setProducts(res.items || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas
  const categories = [...new Set(products.map(p => p.category))];

  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white">
        <div className="px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">🛍️ Tienda</h1>
              <p className="text-blue-100">Compra bebidas, snacks y merchandising</p>
            </div>
            
            {/* Carrito flotante */}
            {itemCount > 0 && (
              <Link
                href="/dashboard/shop/cart"
                className="relative bg-white/20 backdrop-blur-sm rounded-2xl p-3 hover:bg-white/30 transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              </Link>
            )}
          </div>

          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur-sm rounded-2xl border-0 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white/50 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filtros de categoría */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Categorías</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === '' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600">Entrega</p>
            <p className="text-sm font-semibold text-gray-900">Inmediata</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600">Calidad</p>
            <p className="text-sm font-semibold text-gray-900">Garantizada</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-600">Pago</p>
            <p className="text-sm font-semibold text-gray-900">Rápido</p>
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="px-4 mt-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No hay productos disponibles</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm || selectedCategory ? 'Prueba ajustando los filtros' : 'Vuelve más tarde'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <Link 
                key={product.id} 
                href={`/dashboard/shop/product/${product.id}`} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.02] group"
              >
                {/* Imagen del producto */}
                <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                  {Array.isArray(product.media) && product.media.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={product.media[0]?.url || ''} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Badge de categoría */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-1 rounded-lg text-xs font-medium">
                      {product.category}
                    </span>
                  </div>

                  {/* Botón de favorito */}
                  <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                    <Heart className="h-4 w-4 text-gray-600" />
                  </button>

                  {/* Botón de agregar rápido */}
                  <button
                    onClick={(e) => handleQuickAdd(e, product)}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Información del producto */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-gray-600">4.8</span>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        €{Number(product.priceEuro || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600 font-medium">Disponible</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer de beneficios */}
      <div className="px-4 mt-8 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-100">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">¿Por qué comprar con nosotros?</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-green-100 rounded-lg">
                <Clock className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-gray-700">Entrega inmediata</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-100 rounded-lg">
                <Tag className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-gray-700">Mejores precios</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1 bg-purple-100 rounded-lg">
                <Award className="h-3 w-3 text-purple-600" />
              </div>
              <span className="text-gray-700">Calidad garantizada</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-3 w-3 text-yellow-600" />
              </div>
              <span className="text-gray-700">Productos frescos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








