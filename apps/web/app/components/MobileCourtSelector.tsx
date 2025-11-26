"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Star,
  MapPin,
  Clock,
  Zap,
  Wifi,
  Car,
  Shield,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
} from 'lucide-react';

interface Court {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  image?: string;
  rating?: number;
  sportType?: string;
  description?: string;
  availability?: 'high' | 'medium' | 'low';
  lightingExtraPerHour?: number;
}

interface MobileCourtSelectorProps {
  courts: Court[];
  selectedCourt: Court | null;
  onCourtSelect: (court: Court) => void;
  onContinue?: () => void;
  selectedSport: string;
  onSportChange?: (sport: string) => void;
}

export function MobileCourtSelector({
  courts,
  selectedCourt,
  onCourtSelect,
  onContinue,
  selectedSport,
  onSportChange,
}: MobileCourtSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Funciones de utilidad - Iconos de deportes consistentes con la selección
  const getSportLabel = (sport: string) => {
    const labels: Record<string, string> = {
      FOOTBALL: 'Fútbol',
      FOOTBALL7: 'Fútbol 7',
      FUTSAL: 'Fútbol Sala',
      BASKETBALL: 'Baloncesto',
      TENNIS: 'Tenis',
      VOLLEYBALL: 'Voleibol',
      PADDLE: 'Pádel',
      SQUASH: 'Squash',
      MULTIPURPOSE: 'Multiuso',
    };
    return labels[sport?.toUpperCase()] || sport;
  };


  const getSportIcon = (sport: string) => {
    // Usar los mismos iconos emoji que en la selección de deportes
    const getSportEmoji = (sportType: string) => {
      switch (sportType?.toUpperCase()) {
        case 'FOOTBALL':
        case 'FOOTBALL7':
        case 'FUTSAL':
          return '⚽';
        case 'BASKETBALL':
          return '🏀';
        case 'TENNIS':
          return '🎾';
        case 'VOLLEYBALL':
          return '🏐';
        case 'PADDLE':
          return '🏓';
        case 'SQUASH':
          return '🎾';
        case 'MULTIPURPOSE':
          return '🏟️';
        default:
          return '🏅';
      }
    };

    const emoji = getSportEmoji(sport);

    return (
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Círculo de fondo con gradiente suave */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-full blur-sm"></div>

        {/* Contenedor del emoji con efectos */}
        <div className="relative z-10 flex items-center justify-center">
          {/* Sombra del emoji */}
          <div className="absolute text-6xl opacity-20 transform translate-y-1 translate-x-1">
            {emoji}
          </div>

          {/* Emoji principal */}
          <div className="text-6xl drop-shadow-lg transform hover:scale-105 transition-transform duration-200">
            {emoji}
          </div>
        </div>
      </div>
    );
  };

  // Helper para obtener el precio correcto basado en el deporte seleccionado
  const getCourtPrice = (court: any, selectedSport: string): number => {
    if (!court) return 0;
    
    // Si la cancha es multiuso y hay un deporte seleccionado, usar precio específico
    if (court.isMultiuse && selectedSport && court.sportPricing?.[selectedSport]) {
      return court.sportPricing[selectedSport];
    }
    
    // Usar precio base
    return court.pricePerHour;
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      'Iluminación LED': <Zap className="h-4 w-4" />,
      'WiFi gratuito': <Wifi className="h-4 w-4" />,
      'Estacionamiento': <Car className="h-4 w-4" />,
      'Seguridad 24/7': <Shield className="h-4 w-4" />,
    };
    return icons[amenity] || <Check className="h-4 w-4" />;
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'high': return 'Alta disponibilidad';
      case 'medium': return 'Disponibilidad media';
      case 'low': return 'Poca disponibilidad';
      default: return 'Consultar disponibilidad';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Gestos táctiles para navegación
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    if (e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < courts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Navegación con botones
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < courts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Toggle favoritos
  const toggleFavorite = (courtId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(courtId)) {
      newFavorites.delete(courtId);
    } else {
      newFavorites.add(courtId);
    }
    setFavorites(newFavorites);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Scroll automático cuando cambia el índice
  useEffect(() => {
    if (scrollRef.current) {
      const scrollLeft = currentIndex * (scrollRef.current.offsetWidth);
      scrollRef.current.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [currentIndex]);

  if (!courts || courts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏟️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay canchas disponibles
        </h3>
        <p className="text-gray-600">
          No se encontraron canchas para {selectedSport}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* Header con título */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Elige tu cancha de {selectedSport}
        </h2>
        <p className="text-gray-600">
          {courts.length} canchas disponibles
        </p>
      </div>

      {/* Cards individuales apiladas verticalmente */}
      <div className="space-y-4">
        {courts.map((court, index) => (
          <div
            key={court.id}
            className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 overflow-hidden ${selectedCourt?.id === court.id
                ? 'border-blue-500 shadow-lg shadow-blue-100'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
          >
            {/* Header con imagen compacta */}
            <div className="relative h-32 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 overflow-hidden">
              {court.image ? (
                <img
                  src={court.image}
                  alt={court.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  {getSportIcon(court.sportType || selectedSport)}
                </div>
              )}

              {/* Overlay con botones */}
              <div className="absolute inset-0 bg-black bg-opacity-10">
                <div className="absolute top-3 right-3 flex space-x-2">
                  <button
                    onClick={() => toggleFavorite(court.id)}
                    className={`p-2 rounded-full transition-all duration-200 active:scale-95 shadow-md ${favorites.has(court.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-white bg-opacity-90 text-gray-700 hover:bg-opacity-100'
                      }`}
                  >
                    <Heart className={`h-4 w-4 ${favorites.has(court.id) ? 'fill-current' : ''
                      }`} />
                  </button>
                </div>

                {/* Disponibilidad */}
                {court.availability && (
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getAvailabilityColor(court.availability)
                      }`}>
                      {getAvailabilityText(court.availability)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Contenido de la tarjeta */}
            <div className="p-4">
              {/* Header con nombre y precio */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-1">
                    {court.name}
                  </h4>
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <div className="flex items-center bg-blue-50 rounded-lg px-2 py-1">
                      <Users className="h-4 w-4 mr-1 text-blue-600" />
                      <span className="font-medium text-xs">Hasta {court.capacity}</span>
                    </div>
                    {court.rating && (
                      <div className="flex items-center bg-yellow-50 rounded-lg px-2 py-1 text-yellow-600">
                        <Star className="h-4 w-4 mr-1 fill-current" />
                        <span className="font-bold text-xs">{court.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrency(getCourtPrice(court, selectedSport))}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {court.isMultiuse && selectedSport ? `${getSportLabel(selectedSport)} - por hora` : 'por hora'}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              {court.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {court.description}
                </p>
              )}

              {/* Amenidades principales */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {court.amenities.slice(0, 4).map((amenity: string, amenityIndex: number) => (
                  <div key={amenityIndex} className="flex items-center bg-green-50 rounded-lg px-2 py-1.5 border border-green-100">
                    <div className="text-green-600 mr-2">
                      {getAmenityIcon(amenity)}
                    </div>
                    <span className="text-xs font-medium text-green-700 truncate">{amenity}</span>
                  </div>
                ))}
              </div>

              {/* Detalles expandibles */}
              {showDetails === court.id && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Todas las amenidades</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {court.amenities.map((amenity: string, amenityIndex: number) => (
                        <div key={amenityIndex} className="flex items-center text-sm text-gray-600">
                          <div className="text-green-500 mr-2">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Información adicional</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>Sector {court.type}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Disponible 6:00 AM - 10:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDetails(showDetails === court.id ? null : court.id)}
                  className="flex-1 py-2.5 px-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Info className="h-4 w-4 mr-1" />
                  {showDetails === court.id ? 'Menos' : 'Detalles'}
                </button>

                <button
                  onClick={() => onCourtSelect(court)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-98 ${selectedCourt?.id === court.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                >
                  {selectedCourt?.id === court.id ? (
                    <div className="flex items-center justify-center">
                      <Check className="h-4 w-4 mr-1" />
                      Seleccionada
                    </div>
                  ) : (
                    'Seleccionar'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selector de deporte para canchas multiuso */}
      {selectedCourt && (selectedCourt as any).isMultiuse && Array.isArray((selectedCourt as any).allowedSports) && ((selectedCourt as any).allowedSports as string[]).length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Selecciona el deporte para esta cancha multiuso:
          </label>
          <div className="grid grid-cols-2 gap-3">
            {((selectedCourt as any).allowedSports as string[]).map((sport: string) => (
              <button
                key={sport}
                onClick={() => onSportChange?.(sport)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${selectedSport === sport
                    ? 'border-blue-600 bg-blue-100 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="text-2xl mb-1">{getSportIcon(sport)}</div>
                <div className="text-sm">{getSportLabel(sport)}</div>
              </button>
            ))}
          </div>
          {!selectedSport && (
            <p className="mt-3 text-sm text-amber-600">
              ⚠️ Por favor, selecciona un deporte antes de continuar.
            </p>
          )}
        </div>
      )}

      {/* Botón de continuar */}
      {selectedCourt && onContinue && (
        <div className="mt-6 pb-6">
          <button
            onClick={() => {
              // Si la cancha es multiuso, verificar que se haya seleccionado un deporte
              if ((selectedCourt as any).isMultiuse && !selectedSport) {
                alert('Por favor, selecciona un deporte antes de continuar.');
                return;
              }
              onContinue();
            }}
            disabled={(selectedCourt as any).isMultiuse && !selectedSport}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 active:scale-98 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar a Fecha y Hora
            <ChevronRight className="h-5 w-5 ml-2" />
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Paso 3 de 4 - Selecciona fecha y hora
          </p>
        </div>
      )}
    </div>
  );
}