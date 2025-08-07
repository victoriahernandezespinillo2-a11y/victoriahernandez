'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Court {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  image?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  price: number;
}

// Mock data - En producción esto vendría de la API
const mockCourts: Court[] = [
  {
    id: '1',
    name: 'Cancha de Fútbol A',
    type: 'Fútbol',
    capacity: 22,
    pricePerHour: 25000,
    amenities: ['Césped sintético', 'Iluminación LED', 'Vestuarios', 'Graderías']
  },
  {
    id: '2',
    name: 'Cancha de Fútbol B',
    type: 'Fútbol',
    capacity: 22,
    pricePerHour: 25000,
    amenities: ['Césped sintético', 'Iluminación LED', 'Vestuarios']
  },
  {
    id: '3',
    name: 'Cancha de Básquet A',
    type: 'Básquet',
    capacity: 10,
    pricePerHour: 20000,
    amenities: ['Piso de madera', 'Tableros profesionales', 'Iluminación LED']
  },
  {
    id: '4',
    name: 'Cancha de Básquet B',
    type: 'Básquet',
    capacity: 10,
    pricePerHour: 20000,
    amenities: ['Piso sintético', 'Tableros estándar', 'Iluminación']
  },
  {
    id: '5',
    name: 'Cancha de Tenis 1',
    type: 'Tenis',
    capacity: 4,
    pricePerHour: 30000,
    amenities: ['Superficie de arcilla', 'Red profesional', 'Iluminación nocturna']
  },
  {
    id: '6',
    name: 'Cancha de Voleibol A',
    type: 'Voleibol',
    capacity: 12,
    pricePerHour: 18000,
    amenities: ['Piso de madera', 'Red oficial', 'Marcador electrónico']
  }
];

const generateTimeSlots = (selectedDate: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const today = new Date();
  const selected = new Date(selectedDate);
  const isToday = selected.toDateString() === today.toDateString();
  const currentHour = today.getHours();

  for (let hour = 6; hour <= 22; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    const isAvailable = !isToday || hour > currentHour;
    
    slots.push({
      time: timeString,
      available: isAvailable && Math.random() > 0.3, // Simulamos disponibilidad aleatoria
      price: 25000 // Precio base, se ajustará según la cancha
    });
  }
  
  return slots;
};

export default function NewReservationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const sports = ['Fútbol', 'Básquet', 'Tenis', 'Voleibol'];
  const filteredCourts = selectedSport ? mockCourts.filter(court => court.type === selectedSport) : [];
  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];
  
  const totalCost = selectedCourt ? (selectedCourt.pricePerHour * duration / 60) : 0;

  // Obtener fecha mínima (hoy)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  // Obtener fecha máxima (30 días desde hoy)
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!selectedCourt || !selectedDate || !selectedTime) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para crear la reserva
      // const response = await fetch('/api/reservations', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     courtId: selectedCourt.id,
      //     date: selectedDate,
      //     startTime: selectedTime,
      //     duration,
      //     notes,
      //     totalCost
      //   }),
      // });
      
      // Simulamos una reserva exitosa
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('¡Reserva creada exitosamente!');
      router.push('/dashboard/reservations');
    } catch (error) {
      console.error('Error creating reservation:', error);
      alert('Error al crear la reserva. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/reservations"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Reservas
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Reserva</h1>
        <p className="text-gray-500 mt-1">
          Reserva tu cancha deportiva favorita
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {[
            { number: 1, title: 'Deporte', completed: step > 1 },
            { number: 2, title: 'Cancha', completed: step > 2 },
            { number: 3, title: 'Fecha y Hora', completed: step > 3 },
            { number: 4, title: 'Confirmación', completed: false }
          ].map((stepItem, index) => (
            <div key={stepItem.number} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                stepItem.completed
                  ? 'bg-green-600 border-green-600 text-white'
                  : step === stepItem.number
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 text-gray-500'
              }`}>
                {stepItem.completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  stepItem.number
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                stepItem.completed || step === stepItem.number
                  ? 'text-gray-900'
                  : 'text-gray-500'
              }`}>
                {stepItem.title}
              </span>
              {index < 3 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  stepItem.completed ? 'bg-green-600' : 'bg-gray-300'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Step 1: Select Sport */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Selecciona el Deporte
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => {
                    setSelectedSport(sport);
                    setSelectedCourt(null);
                  }}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectedSport === sport
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">⚽</div>
                    <div className="font-medium">{sport}</div>
                  </div>
                </button>
              ))}
            </div>
            {selectedSport && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Court */}
        {step === 2 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Selecciona la Cancha de {selectedSport}
              </h2>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cambiar deporte
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourts.map((court) => (
                <div
                  key={court.id}
                  onClick={() => setSelectedCourt(court)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedCourt?.id === court.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{court.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Users className="h-4 w-4 mr-1" />
                        Hasta {court.capacity} personas
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(court.pricePerHour)}
                      </div>
                      <div className="text-sm text-gray-500">por hora</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {court.amenities.map((amenity, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-center">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {selectedCourt && (
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Date and Time */}
        {step === 3 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Selecciona Fecha y Hora
              </h2>
              <button
                onClick={() => setStep(2)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cambiar cancha
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha
                </label>
                <input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Duración
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={60}>1 hora</option>
                  <option value={90}>1.5 horas</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                </select>
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Horarios Disponibles para {formatDate(selectedDate)}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`p-3 rounded-md text-sm font-medium transition-colors ${
                        !slot.available
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedTime === slot.time
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Agrega cualquier información adicional sobre tu reserva..."
              />
            </div>

            {selectedDate && selectedTime && (
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Revisar Reserva
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Confirmar Reserva
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Detalles de la Reserva</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cancha:</span>
                      <span className="text-gray-900">{selectedCourt?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deporte:</span>
                      <span className="text-gray-900">{selectedSport}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha:</span>
                      <span className="text-gray-900">{formatDate(selectedDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hora:</span>
                      <span className="text-gray-900">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duración:</span>
                      <span className="text-gray-900">{duration} minutos</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Resumen de Pago</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Precio por hora:</span>
                      <span className="text-gray-900">{formatCurrency(selectedCourt?.pricePerHour || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duración:</span>
                      <span className="text-gray-900">{duration / 60} hora(s)</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">{formatCurrency(totalCost)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Notas:</h4>
                  <p className="text-sm text-gray-600">{notes}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Términos de la Reserva:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Las reservas deben ser canceladas con al menos 2 horas de anticipación</li>
                    <li>Los reembolsos se procesarán según la política de cancelación</li>
                    <li>Es necesario llegar 10 minutos antes del horario reservado</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Anterior
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {isLoading ? 'Procesando...' : 'Confirmar y Pagar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}