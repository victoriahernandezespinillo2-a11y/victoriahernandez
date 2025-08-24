"use client";

import { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Badge } from '@repo/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from '@repo/ui/dialog';
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { Switch } from '@repo/ui/switch';
import { toast } from 'sonner';
import { useModalScroll } from '../../hooks/useModalScroll';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  priceEuro: number;
  taxRate: number;
  stockQty: number;
  isActive: boolean;
  isPerishable: boolean;
  expiresAt?: string;
  creditMultiplier?: number;
  centerId: string;
  createdAt: string;
  updatedAt: string;
}

interface Center {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [centers, setCenters] = useState<Center[]>([]); // Siempre será un array
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [showActive, setShowActive] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCenterSelectOpen, setIsCenterSelectOpen] = useState(false);
  const [formData, setFormData] = useState({
    centerId: '',
    name: '',
    sku: '',
    category: '',
    priceEuro: 0,
    taxRate: 0,
    stockQty: 0,
    isActive: true,
    isPerishable: false,
    expiresAt: '',
    creditMultiplier: 0,
  });

  // Usar el hook para manejar el scroll del body
  useModalScroll(isCreateDialogOpen || isEditDialogOpen);

  useEffect(() => {
    fetchCenters();
    fetchProducts();
  }, [page, search, selectedCenter, showActive]);

  const fetchCenters = async () => {
    try {
      const response = await fetch('/api/admin/centers', { credentials: 'include' });
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        console.error('Error fetching centers:', response.status, response.statusText);
        setCenters([]); // Establecer array vacío en caso de error
        return;
      }
      
      // Verificar si hay contenido en la respuesta
      const text = await response.text();
      if (!text) {
        console.error('Empty response from centers API');
        setCenters([]); // Establecer array vacío en caso de respuesta vacía
        return;
      }
      
      // Intentar parsear JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON response from centers API:', text);
        setCenters([]); // Establecer array vacío en caso de JSON inválido
        return;
      }
      
      // Verificar estructura de respuesta y establecer centers
      if (data.success && Array.isArray(data.data)) {
        setCenters(data.data);
      } else if (Array.isArray(data)) {
        // Si la respuesta es directamente un array
        setCenters(data);
      } else if (data.data && Array.isArray(data.data)) {
        // Si la respuesta tiene estructura { data: [...] }
        setCenters(data.data);
      } else {
        console.error('Unexpected centers response structure:', data);
        setCenters([]); // Establecer array vacío en caso de estructura inesperada
      }
    } catch (error) {
      console.error('Error fetching centers:', error);
      setCenters([]); // Establecer array vacío en caso de error
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(selectedCenter && { centerId: selectedCenter }),
        ...(showActive !== undefined && { active: showActive.toString() }),
      });
      
      const response = await fetch(`/api/admin/products?${params}`, { credentials: 'include' });
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        console.error('Error fetching products:', response.status, response.statusText);
        toast.error(`Error cargando productos: ${response.status}`);
        return;
      }
      
      // Verificar si hay contenido en la respuesta
      const text = await response.text();
      if (!text) {
        console.error('Empty response from products API');
        toast.error('Respuesta vacía del servidor');
        return;
      }
      
      // Intentar parsear JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON response from products API:', text);
        toast.error('Respuesta inválida del servidor');
        return;
      }
      
      if (data.success) {
        setProducts(data.data.items);
        setTotalPages(data.data.pagination.pages);
      } else {
        toast.error(data.message || 'Error cargando productos');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Producto creado exitosamente');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchProducts();
      } else {
        toast.error(data.message || 'Error creando producto');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Error creando producto');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    try {
      const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Producto actualizado exitosamente');
        setIsEditDialogOpen(false);
        setEditingProduct(null);
        resetForm();
        fetchProducts();
      } else {
        toast.error(data.message || 'Error actualizando producto');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error actualizando producto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Producto eliminado exitosamente');
        fetchProducts();
      } else {
        toast.error(data.message || 'Error eliminando producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error eliminando producto');
    }
  };

  const resetForm = () => {
    setFormData({
      centerId: '',
      name: '',
      sku: '',
      category: '',
      priceEuro: 0,
      taxRate: 0,
      stockQty: 0,
      isActive: true,
      isPerishable: false,
      expiresAt: '',
      creditMultiplier: 0,
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      centerId: product.centerId,
      name: product.name,
      sku: product.sku,
      category: product.category,
      priceEuro: product.priceEuro,
      taxRate: product.taxRate,
      stockQty: product.stockQty,
      isActive: product.isActive,
      isPerishable: product.isPerishable,
      expiresAt: product.expiresAt || '',
      creditMultiplier: product.creditMultiplier || 0,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
        
        {/* Modal de Crear Producto */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          
          {isCreateDialogOpen && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Producto</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="centerId">Centro</Label>
                    <Select value={formData.centerId} onValueChange={(value) => setFormData({ ...formData, centerId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar centro" />
                      </SelectTrigger>
                      <SelectContent>
                        {centers.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre del producto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Código SKU"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Categoría"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceEuro">Precio (€)</Label>
                    <Input
                      id="priceEuro"
                      type="number"
                      step="0.01"
                      value={formData.priceEuro}
                      onChange={(e) => setFormData({ ...formData, priceEuro: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Impuesto (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockQty">Stock</Label>
                    <Input
                      id="stockQty"
                      type="number"
                      value={formData.stockQty}
                      onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditMultiplier">Multiplicador de Créditos</Label>
                    <Input
                      id="creditMultiplier"
                      type="number"
                      step="0.01"
                      value={formData.creditMultiplier}
                      onChange={(e) => setFormData({ ...formData, creditMultiplier: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Fecha de Expiración</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Activo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPerishable"
                      checked={formData.isPerishable}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPerishable: checked })}
                    />
                    <Label htmlFor="isPerishable">Perecedero</Label>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>Crear Producto</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="relative">
            <Select>
              <SelectTrigger 
                className="w-48" 
                onClick={() => setIsCenterSelectOpen(!isCenterSelectOpen)}
              >
                <SelectValue>
                  {selectedCenter && Array.isArray(centers) ? centers.find(c => c.id === selectedCenter)?.name : "Todos los centros"}
                </SelectValue>
              </SelectTrigger>
              {isCenterSelectOpen && (
                <SelectContent>
                  <SelectItem 
                    value="" 
                    onClick={() => {
                      setSelectedCenter('');
                      setIsCenterSelectOpen(false);
                    }}
                  >
                    Todos los centros
                  </SelectItem>
                  {Array.isArray(centers) && centers.map((center) => (
                    <SelectItem 
                      key={center.id} 
                      value={center.id}
                      onClick={() => {
                        setSelectedCenter(center.id);
                        setIsCenterSelectOpen(false);
                      }}
                    >
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              )}
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={showActive}
              onCheckedChange={setShowActive}
            />
            <Label>Solo activos</Label>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Cargando productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{centers.find(c => c.id === product.centerId)?.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{product.priceEuro.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={product.stockQty > 0 ? 'default' : 'destructive'}>
                        {product.stockQty}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-700">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modal de Editar Producto */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        {isEditDialogOpen && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Input
                    id="edit-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Categoría"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priceEuro">Precio (€)</Label>
                  <Input
                    id="edit-priceEuro"
                    type="number"
                    step="0.01"
                    value={formData.priceEuro}
                    onChange={(e) => setFormData({ ...formData, priceEuro: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-taxRate">Impuesto (%)</Label>
                  <Input
                    id="edit-taxRate"
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stockQty">Stock</Label>
                  <Input
                    id="edit-stockQty"
                    type="number"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-creditMultiplier">Multiplicador de Créditos</Label>
                  <Input
                    id="edit-creditMultiplier"
                    type="number"
                    step="0.01"
                    value={formData.creditMultiplier}
                    onChange={(e) => setFormData({ ...formData, creditMultiplier: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expiresAt">Fecha de Expiración</Label>
                  <Input
                    id="edit-expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="edit-isActive">Activo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isPerishable"
                    checked={formData.isPerishable}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPerishable: checked })}
                  />
                  <Label htmlFor="edit-isPerishable">Perecedero</Label>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate}>Actualizar Producto</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
