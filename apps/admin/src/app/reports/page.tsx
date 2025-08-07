'use client';

import { useState } from 'react';
import { Calendar, Download, Filter, TrendingUp, TrendingDown, Users, DollarSign, Clock, MapPin, BarChart3, PieChart, Activity } from 'lucide-react';

interface ReportData {
  period: string;
  totalRevenue: number;
  totalReservations: number;
  totalUsers: number;
  averageReservationValue: number;
  occupancyRate: number;
  popularCourts: { name: string; reservations: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  reservationsByDay: { day: string; count: number }[];
}

const mockReportData: ReportData = {
  period: 'Enero 2024',
  totalRevenue: 15750000,
  totalReservations: 542,
  totalUsers: 234,
  averageReservationValue: 29058,
  occupancyRate: 78.5,
  popularCourts: [
    { name: 'Cancha Fútbol 1', reservations: 89 },
    { name: 'Cancha Básquetbol 1', reservations: 76 },
    { name: 'Cancha Tenis 1', reservations: 65 },
    { name: 'Cancha Fútbol 2', reservations: 58 },
    { name: 'Cancha Vóleibol 1', reservations: 45 }
  ],
  revenueByMonth: [
    { month: 'Jul', revenue: 12500000 },
    { month: 'Ago', revenue: 13200000 },
    { month: 'Sep', revenue: 14100000 },
    { month: 'Oct', revenue: 13800000 },
    { month: 'Nov', revenue: 14500000 },
    { month: 'Dic', revenue: 15200000 },
    { month: 'Ene', revenue: 15750000 }
  ],
  reservationsByDay: [
    { day: 'Lun', count: 65 },
    { day: 'Mar', count: 72 },
    { day: 'Mié', count: 68 },
    { day: 'Jue', count: 78 },
    { day: 'Vie', count: 85 },
    { day: 'Sáb', count: 95 },
    { day: 'Dom', count: 79 }
  ]
};

const quickReports = [
  {
    id: 'revenue',
    name: 'Reporte de Ingresos',
    description: 'Análisis detallado de ingresos por período',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'reservations',
    name: 'Reporte de Reservas',
    description: 'Estadísticas de reservas y ocupación',
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'users',
    name: 'Reporte de Usuarios',
    description: 'Análisis de usuarios y membresías',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'courts',
    name: 'Reporte de Canchas',
    description: 'Utilización y rendimiento de canchas',
    icon: MapPin,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-01-31'
  });

  const calculateGrowth = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(growth).toFixed(1),
      isPositive: growth >= 0
    };
  };

  const revenueGrowth = calculateGrowth(15750000, 14500000);
  const reservationGrowth = calculateGrowth(542, 498);
  const userGrowth = calculateGrowth(234, 218);
  const occupancyGrowth = calculateGrowth(78.5, 72.3);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reportes y Análisis</h1>
            <p className="text-gray-600">Análisis detallado del rendimiento del polideportivo</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Controles de período */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setSelectedPeriod('quarter')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'quarter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedPeriod === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Año
            </button>
          </div>
          <div className="flex gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Desde:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Hasta:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">${mockReportData.totalRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                {revenueGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  revenueGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reservas</p>
              <p className="text-2xl font-bold text-gray-900">{mockReportData.totalReservations}</p>
              <div className="flex items-center gap-1 mt-1">
                {reservationGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  reservationGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reservationGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{mockReportData.totalUsers}</p>
              <div className="flex items-center gap-1 mt-1">
                {userGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  userGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {userGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Ocupación</p>
              <p className="text-2xl font-bold text-gray-900">{mockReportData.occupancyRate}%</p>
              <div className="flex items-center gap-1 mt-1">
                {occupancyGrowth.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  occupancyGrowth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {occupancyGrowth.value}%
                </span>
                <span className="text-sm text-gray-500">vs mes anterior</span>
              </div>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Gráficos y análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de ingresos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Evolución de Ingresos</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {mockReportData.revenueByMonth.map((item, index) => {
              const maxRevenue = Math.max(...mockReportData.revenueByMonth.map(r => r.revenue));
              const percentage = (item.revenue / maxRevenue) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-8">{item.month}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-20 text-right">
                    ${(item.revenue / 1000000).toFixed(1)}M
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reservas por día */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Reservas por Día de la Semana</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {mockReportData.reservationsByDay.map((item, index) => {
              const maxCount = Math.max(...mockReportData.reservationsByDay.map(r => r.count));
              const percentage = (item.count / maxCount) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-8">{item.day}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Canchas más populares */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Canchas Más Populares</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {mockReportData.popularCourts.map((court, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{court.reservations}</div>
              <div className="text-sm text-gray-600">{court.name}</div>
              <div className="text-xs text-gray-500 mt-1">reservas</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reportes rápidos */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reportes Rápidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
              >
                <div className={`w-12 h-12 ${report.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{report.name}</h4>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}