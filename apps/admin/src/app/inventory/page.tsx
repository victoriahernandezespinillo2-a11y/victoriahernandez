"use client";

import { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, ArrowUpIcon, ArrowDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Badge } from '@repo/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody, DialogFooter } from '@repo/ui/dialog';
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQty: number;
  centerId: string;
}

interface Center {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'WASTE';
  qty: number;
  reason?: string;
  createdAt: string;
  product: {
    name: string;
    sku: string;
  };
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    type: 'IN' as 'IN' | 'OUT' | 'ADJUST' | 'WASTE',
    qty: 1,
    reason: '',
  });

  useEffect(() => {
    fetchCenters();
    fetchProducts();
    fetchMovements();
  }, [search, selectedCenter]);

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
      // Formatos soportados:
      // 1) { success: true, data: { data: [...] } }  -> actual API admin
      // 2) { success: true, data: [...] }
      // 3) { data: [...] }
      // 4) [...]
      const maybeNested = data?.data?.data;
      if (Array.isArray(maybeNested)) {
        setCenters(maybeNested);
      } else if (data?.success && Array.isArray(data?.data)) {
        setCenters(data.data);
      } else if (Array.isArray(data)) {
        // Si la respuesta es directamente un array
        setCenters(data);
      } else if (data?.data && Array.isArray(data.data)) {
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
    try {
      console.log('📦 [INVENTORY] Cargando productos...');
      const params = new URLSearchParams({
        limit: '100',
        ...(search && { search }),
        ...(selectedCenter && { centerId: selectedCenter }),
        active: 'true',
      });
      
      console.log('🌐 [INVENTORY] URL productos:', `/api/admin/products?${params}`);
      const response = await fetch(`/api/admin/products?${params}`, { credentials: 'include' });
      console.log('📡 [INVENTORY] Respuesta productos:', response.status, response.statusText);
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        console.error('Error fetching products:', response.status, response.statusText);
        return;
      }
      
      // Verificar si hay contenido en la respuesta
      const text = await response.text();
      if (!text) {
        console.error('Empty response from products API');
        return;
      }
      
      // Intentar parsear JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON response from products API:', text);
        return;
      }
      
      if (data.success) {
        console.log('✅ [INVENTORY] Productos cargados:', data.data.items.length);
        console.log('📋 [INVENTORY] Productos:', data.data.items);
        console.log('📊 [INVENTORY] Stock del primer producto:', data.data.items[0]?.stockQty);
        setProducts(data.data.items);
      } else {
        console.error('❌ [INVENTORY] Error cargando productos:', data.message);
      }
    } catch (error) {
      console.error('❌ [INVENTORY] Error fetching products:', error);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      console.log('📊 [INVENTORY] Cargando movimientos...');
      const response = await fetch('/api/admin/inventory/movements', { credentials: 'include' });
      console.log('📡 [INVENTORY] Respuesta movimientos:', response.status, response.statusText);
      
      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        console.error('Error fetching movements:', response.status, response.statusText);
        return;
      }
      
      // Verificar si hay contenido en la respuesta
      const text = await response.text();
      if (!text) {
        console.error('Empty response from movements API');
        return;
      }
      
      // Intentar parsear JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Invalid JSON response from movements API:', text);
        return;
      }
      
      if (data.success) {
        console.log('✅ [INVENTORY] Movimientos cargados:', data.data.length);
        console.log('📋 [INVENTORY] Movimientos:', data.data);
        setMovements(data.data);
      } else {
        console.error('❌ [INVENTORY] Error cargando movimientos:', data.message);
      }
    } catch (error) {
      console.error('❌ [INVENTORY] Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovement = async () => {
    try {
      const response = await fetch('/api/admin/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Movimiento registrado exitosamente');
        setIsMovementDialogOpen(false);
        resetForm();
        fetchProducts();
        fetchMovements();
      } else {
        toast.error(data.message || 'Error registrando movimiento');
      }
    } catch (error) {
      console.error('Error creating movement:', error);
      toast.error('Error registrando movimiento');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      type: 'IN',
      qty: 1,
      reason: '',
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
      case 'OUT':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
      case 'WASTE':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />;
      default:
        return <ArrowUpIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'IN':
        return <Badge variant="default" className="bg-green-100 text-green-800">Entrada</Badge>;
      case 'OUT':
        return <Badge variant="destructive">Salida</Badge>;
      case 'WASTE':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pérdida</Badge>;
      default:
        return <Badge variant="outline">Ajuste</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        
        {/* Modal de Movimiento de Inventario */}
        <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setIsMovementDialogOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors duration-200 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </DialogTrigger>
          
          {isMovementDialogOpen && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Producto</Label>
                    <Select value={formData.productId} onValueChange={(value) => setFormData({ ...formData, productId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - Stock: {product.stockQty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Movimiento</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Entrada</SelectItem>
                        <SelectItem value="OUT">Salida</SelectItem>
                        <SelectItem value="ADJUST">Ajuste</SelectItem>
                        <SelectItem value="WASTE">Pérdida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qty">Cantidad</Label>
                    <Input
                      id="qty"
                      type="number"
                      min="1"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo (opcional)</Label>
                    <Textarea
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Motivo del movimiento..."
                      rows={3}
                    />
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleMovement}>Registrar Movimiento</Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center">
          <div className="w-full sm:flex-1">
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
          <div className="relative w-full sm:w-48">
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los centros">
                  {selectedCenter && Array.isArray(centers) ? centers.find(c => c.id === selectedCenter)?.name : "Todos los centros"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  Todos los centros
                </SelectItem>
                {Array.isArray(centers) && centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Stock</h3>
          <div className="space-y-3">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <Badge variant={product.stockQty > 0 ? 'default' : 'destructive'}>
                  {product.stockQty}
                </Badge>
              </div>
            ))}
            {products.length > 5 && (
              <p className="text-sm text-gray-500 text-center">
                +{products.length - 5} productos más
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos con Stock Bajo</h3>
          <div className="space-y-3">
            {products.filter(p => p.stockQty <= 5).slice(0, 5).map((product) => (
              <div key={product.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <Badge variant="destructive">
                  {product.stockQty}
                </Badge>
              </div>
            ))}
            {products.filter(p => p.stockQty <= 5).length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                No hay productos con stock bajo
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sin Stock</h3>
          <div className="space-y-3">
            {products.filter(p => p.stockQty === 0).slice(0, 5).map((product) => (
              <div key={product.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <Badge variant="destructive">
                  Agotado
                </Badge>
              </div>
            ))}
            {products.filter(p => p.stockQty === 0).length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                No hay productos agotados
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Movimientos Recientes</h3>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No se encontraron movimientos
                    </td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{movement.product.name}</div>
                          <div className="text-sm text-gray-500">{movement.product.sku}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getMovementIcon(movement.type)}
                          {getMovementBadge(movement.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.qty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(movement.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Lista móvil (cards) */}
          <div className="md:hidden divide-y divide-gray-200">
            {loading ? (
              <div className="py-4 text-center text-gray-500">Cargando movimientos...</div>
            ) : movements.length === 0 ? (
              <div className="py-4 text-center text-gray-500">No se encontraron movimientos</div>
            ) : (
              movements.map((movement) => (
                <div key={movement.id} className="py-3 flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{movement.product.name}</div>
                    <div className="text-xs text-gray-500 truncate">{movement.product.sku}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {getMovementBadge(movement.type)}
                      <span className="text-xs text-gray-600">Cant.: {movement.qty}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {movement.reason || '-'}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-xs text-gray-500">
                    {new Date(movement.createdAt).toLocaleDateString('es-ES', {
                      year: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
