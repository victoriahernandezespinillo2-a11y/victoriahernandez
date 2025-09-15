'use client';

import { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Reservation {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  courtName: string;
  status: string;
  userName: string;
}

interface OccupancyCalendarProps {
  reservations: Reservation[];
  onReservationClick?: (reservation: Reservation) => void;
}

export default function OccupancyCalendar({ reservations, onReservationClick }: OccupancyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Calcular días del mes
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Ajustar para formato español (lunes = 0, domingo = 6)
  const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
  
  // Crear array de días del mes
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Agrupar reservas por fecha
  const reservationsByDate = useMemo(() => {
    const grouped: { [key: string]: Reservation[] } = {};
    reservations.forEach(reservation => {
      const date = reservation.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(reservation);
    });
    return grouped;
  }, [reservations]);
  
  // Obtener estadísticas de ocupación para una fecha
  const getOccupancyStats = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayReservations = reservationsByDate[dateStr] || [];
    
    const total = dayReservations.length;
    const paid = dayReservations.filter(r => r.status === 'PAID' || r.status === 'COMPLETED').length;
    const cancelled = dayReservations.filter(r => r.status === 'CANCELLED').length;
    const pending = dayReservations.filter(r => r.status === 'PENDING').length;
    
    return { total, paid, cancelled, pending };
  };
  
  // Navegar entre meses
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Calendario de Ocupación</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
            title="Mes anterior"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
            title="Mes siguiente"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h4>
      </div>
      
      {/* Encabezados de días */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendario */}
      <div className="grid grid-cols-7 gap-1">
        {/* Días vacíos del mes anterior */}
        {Array.from({ length: startingDayOfWeek }, (_, i) => (
          <div key={`empty-${i}`} className="h-24 p-1 border border-gray-100 rounded-lg bg-gray-50"></div>
        ))}
        
        {/* Días del mes */}
        {days.map(day => {
          const stats = getOccupancyStats(day);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayReservations = reservationsByDate[dateStr] || [];
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
          
          return (
            <div
              key={day}
              className={`h-24 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                isToday ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white'
              } ${dayReservations.length > 0 ? 'hover:shadow-md' : ''}`}
              onClick={() => {
                if (dayReservations.length > 0 && onReservationClick && dayReservations[0]) {
                  onReservationClick(dayReservations[0]);
                }
              }}
            >
              <div className="flex flex-col h-full">
                <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                  {day}
                </div>
                
                {stats.total > 0 ? (
                  <div className="flex-1 flex flex-col justify-center space-y-1">
                    {stats.paid > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-700 font-medium">{stats.paid}</span>
                      </div>
                    )}
                    {stats.pending > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-gray-700 font-medium">{stats.pending}</span>
                      </div>
                    )}
                    {stats.cancelled > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-gray-700 font-medium">{stats.cancelled}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-gray-400">-</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Leyenda */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Pagadas/Completadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">Pendientes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Canceladas</span>
        </div>
      </div>
    </div>
  );
}
