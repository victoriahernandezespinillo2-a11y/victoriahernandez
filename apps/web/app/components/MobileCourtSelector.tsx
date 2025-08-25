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
}

interface MobileCourtSelectorProps {
  courts: Court[];
  selectedCourt: Court | null;
  onCourtSelect: (court: Court) => void;
  selectedSport: string;
}

export function MobileCourtSelector({
  courts,
  selectedCourt,
  onCourtSelect,
  selectedSport,
}: MobileCourtSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Funciones de utilidad
  const getSportIcon = (sport: string) => {
    const icons: { [key: string]: string } = {
      football: '⚽',
      basketball: '🏀',
      tennis: '🎾',
      volleyball: '🏐',
    };
    return icons[sport] || '🏃';
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
    <div className="relative">
      {/* Header con contador */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Canchas disponibles
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} de {courts.length}
          </span>
          <div className="flex space-x-1">
            {courts.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Carrusel de canchas */}
      <div className="relative">
        {/* Botones de navegación */}
        {courts.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all ${
                currentIndex === 0
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === courts.length - 1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all ${
                currentIndex === courts.length - 1
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white text-gray-700 hover:bg-gray-50 active:scale-95'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Contenedor del carrusel */}
        <div
          ref={scrollRef}
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              width: `${courts.length * 100}%`
            }}
          >
            {courts.map((court, index) => (
              <div
                key={court.id}
                className="w-full flex-shrink-0 px-1"
              >
                <div
                  className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-200 overflow-hidden ${
                    selectedCourt?.id === court.id
                      ? 'border-blue-500 shadow-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Imagen de fondo o gradiente */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
                    {court.image ? (
                      <img
                        src={court.image}
                        alt={court.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-6xl text-white opacity-80">
                          {getSportIcon(court.sportType || selectedSport)}
                        </div>
                      </div>
                    )}
                    
                    {/* Overlay con botones */}
                    <div className="absolute inset-0 bg-black bg-opacity-20">
                      <div className="absolute top-3 right-3 flex space-x-2">
                        <button
                          onClick={() => toggleFavorite(court.id)}
                          className={`p-2 rounded-full transition-all ${
                            favorites.has(court.id)
                              ? 'bg-red-500 text-white'
                              : 'bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${
                            favorites.has(court.id) ? 'fill-current' : ''
                          }`} />
                        </button>
                        <button
                          onClick={() => setShowDetails(showDetails === court.id ? null : court.id)}
                          className="p-2 rounded-full bg-white bg-opacity-80 text-gray-700 hover:bg-opacity-100 transition-all"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Disponibilidad */}
                      {court.availability && (
                        <div className="absolute top-3 left-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            getAvailabilityColor(court.availability)
                          }`}>
                            {getAvailabilityText(court.availability)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenido de la tarjeta */}
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-gray-900 mb-1">
                          {court.name}
                        </h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span>Hasta {court.capacity}</span>
                          </div>
                          {court.rating && (
                            <div className="flex items-center text-yellow-500">
                              <Star className="h-4 w-4 mr-1 fill-current" />
                              <span className="font-medium">{court.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(court.pricePerHour)}
                        </div>
                        <div className="text-sm text-gray-500">por hora</div>
                      </div>
                    </div>

                    {/* Descripción */}
                    {court.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {court.description}
                      </p>
                    )}

                    {/* Amenidades principales */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {court.amenities.slice(0, 4).map((amenity: string, amenityIndex: number) => (
                        <div key={amenityIndex} className="flex items-center text-sm text-gray-600">
                          <div className="text-green-500 mr-2">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span className="truncate">{amenity}</span>
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

                    {/* Botón de selección */}
                    <button
                      onClick={() => onCourtSelect(court)}
                      className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 active:scale-98 ${
                        selectedCourt?.id === court.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedCourt?.id === court.id ? (
                        <div className="flex items-center justify-center">
                          <Check className="h-5 w-5 mr-2" />
                          Seleccionada
                        </div>
                      ) : (
                        'Seleccionar esta cancha'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicadores de deslizamiento */}
      {courts.length > 1 && (
        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Desliza para ver más canchas
          </p>
        </div>
      )}
    </div>
  );
}