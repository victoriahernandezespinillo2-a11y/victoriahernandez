'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon as Search,
  PlusIcon as Plus,
  PencilIcon as Edit,
  TrashIcon as Trash2,
  ClockIcon as Clock,
  MapPinIcon as MapPin,
  CurrencyDollarIcon as DollarSign,
  CalendarDaysIcon as Calendar,
  CheckIcon as Save,
  XMarkIcon as X,
} from '@heroicons/react/24/outline';

interface PricingRule {
  id: string;
  name: string;
  courtType: string;
  center: string;
  timeSlot: {
    start: string;
    end: string;
  };
  dayOfWeek: string[];
  basePrice: number;
  peakHourMultiplier: number;
  membershipDiscount: {
    basic: number;
    premium: number;
    vip: number;
  };
  seasonalAdjustment: number;
  status: 'active' | 'inactive';
  validFrom: string;
  validTo: string;
}

const mockPricingRules: PricingRule[] = [
  {
    id: '1',
    name: 'Fútbol - Horario Normal',
    courtType: 'Fútbol',
    center: 'Centro Principal',
    timeSlot: {
      start: '08:00',
      end: '18:00'
    },
    dayOfWeek: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    basePrice: 25000,
    peakHourMultiplier: 1.0,
    membershipDiscount: {
      basic: 0,
      premium: 10,
      vip: 20
    },
    seasonalAdjustment: 0,
    status: 'active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '2',
    name: 'Fútbol - Horario Pico',
    courtType: 'Fútbol',
    center: 'Centro Principal',
    timeSlot: {
      start: '18:00',
      end: '22:00'
    },
    dayOfWeek: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    basePrice: 25000,
    peakHourMultiplier: 1.5,
    membershipDiscount: {
      basic: 0,
      premium: 10,
      vip: 20
    },
    seasonalAdjustment: 0,
    status: 'active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '3',
    name: 'Fútbol - Fin de Semana',
    courtType: 'Fútbol',
    center: 'Centro Principal',
    timeSlot: {
      start: '08:00',
      end: '22:00'
    },
    dayOfWeek: ['sábado', 'domingo'],
    basePrice: 25000,
    peakHourMultiplier: 1.3,
    membershipDiscount: {
      basic: 0,
      premium: 10,
      vip: 20
    },
    seasonalAdjustment: 0,
    status: 'active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '4',
    name: 'Básquetbol - Horario Normal',
    courtType: 'Básquetbol',
    center: 'Centro Principal',
    timeSlot: {
      start: '08:00',
      end: '20:00'
    },
    dayOfWeek: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
    basePrice: 20000,
    peakHourMultiplier: 1.2,
    membershipDiscount: {
      basic: 0,
      premium: 10,
      vip: 20
    },
    seasonalAdjustment: 0,
    status: 'active',
    validFrom: '2024-01-01',
    validTo: '2024-12-31'
  },
  {
    id: '5',
    name: 'Tenis - Promoción Verano',
    courtType: 'Tenis',
    center: 'Centro Secundario',
    timeSlot: {
      start: '06:00',
      end: '10:00'
    },
    dayOfWeek: ['sábado', 'domingo'],
    basePrice: 30000,
    peakHourMultiplier: 0.8,
    membershipDiscount: {
      basic: 5,
      premium: 15,
      vip: 25
    },
    seasonalAdjustment: -20,
    status: 'active',
    validFrom: '2024-12-01',
    validTo: '2024-03-31'
  }
];

const dayNames = {
  'lunes': 'L',
  'martes': 'M',
  'miércoles': 'X',
  'jueves': 'J',
  'viernes': 'V',
  'sábado': 'S',
  'domingo': 'D'
};

export default function PricingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [courtTypeFilter, setCourtTypeFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const itemsPerPage = 10;

  const filteredRules = mockPricingRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.courtType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourtType = courtTypeFilter === 'all' || rule.courtType === courtTypeFilter;
    const matchesCenter = centerFilter === 'all' || rule.center === centerFilter;
    const matchesStatus = statusFilter === 'all' || rule.status === statusFilter;
    
    return matchesSearch && matchesCourtType && matchesCenter && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRules = filteredRules.slice(startIndex, startIndex + itemsPerPage);

  const calculateFinalPrice = (rule: PricingRule, membershipType: 'basic' | 'premium' | 'vip' | 'none' = 'none') => {
    let price = rule.basePrice * rule.peakHourMultiplier;
    
    // Aplicar descuento por membresía
    if (membershipType !== 'none') {
      const discount = rule.membershipDiscount[membershipType];
      price = price * (1 - discount / 100);
    }
    
    // Aplicar ajuste estacional
    price = price * (1 + rule.seasonalAdjustment / 100);
    
    return Math.round(price);
  };

  const uniqueCourtTypes = [...new Set(mockPricingRules.map(rule => rule.courtType))];
  const uniqueCenters = [...new Set(mockPricingRules.map(rule => rule.center))];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración de Precios</h1>
            <p className="text-gray-600">Gestiona las reglas de precios para canchas y servicios</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva Regla de Precio
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reglas Activas</p>
              <p className="text-2xl font-bold text-gray-900">{mockPricingRules.filter(r => r.status === 'active').length}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Precio Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                ${Math.round(mockPricingRules.reduce((sum, rule) => sum + calculateFinalPrice(rule), 0) / mockPricingRules.length).toLocaleString()}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tipos de Cancha</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueCourtTypes.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Centros</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueCenters.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar reglas de precio..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={courtTypeFilter}
              onChange={(e) => setCourtTypeFilter(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {uniqueCourtTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
            >
              <option value="all">Todos los centros</option>
              {uniqueCenters.map(center => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de reglas de precio */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Cancha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Final
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
              {paginatedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      <div className="text-sm text-gray-500">{rule.center}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.courtType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.timeSlot.start} - {rule.timeSlot.end}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      {rule.dayOfWeek.map(day => (
                        <span key={day} className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {dayNames[day as keyof typeof dayNames]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rule.basePrice.toLocaleString()}
                    {rule.peakHourMultiplier !== 1.0 && (
                      <div className="text-xs text-gray-500">
                        x{rule.peakHourMultiplier} pico
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${calculateFinalPrice(rule).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      VIP: ${calculateFinalPrice(rule, 'vip').toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      rule.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {rule.status === 'active' ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredRules.length)}</span> de{' '}
                  <span className="font-medium">{filteredRules.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear nueva regla */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nueva Regla de Precio</h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la regla</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Fútbol - Horario Normal"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cancha</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Seleccionar tipo</option>
                    <option value="Fútbol">Fútbol</option>
                    <option value="Básquetbol">Básquetbol</option>
                    <option value="Tenis">Tenis</option>
                    <option value="Vóleibol">Vóleibol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Centro</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Seleccionar centro</option>
                    <option value="Centro Principal">Centro Principal</option>
                    <option value="Centro Secundario">Centro Secundario</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio base</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="25000"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Save className="w-4 h-4" />
                  Guardar Regla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}