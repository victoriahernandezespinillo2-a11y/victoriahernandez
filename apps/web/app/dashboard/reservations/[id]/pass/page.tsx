'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@repo/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';
import { ArrowLeft, Download, Share2, Calendar, Smartphone, CreditCard } from 'lucide-react';
import WalletPassGenerator from '@/components/WalletPassGenerator';

interface ReservationDetails {
  id: string;
  court: {
    name: string;
    center: {
      name?: string | null;
    };
  };
  user: {
    name?: string | null;
  };
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
}

export default function ReservationPassPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const reservationId = params?.id as string;

  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReservationPass() {
      try {
        setLoading(true);
        setError(null);

        if (!reservationId) {
          throw new Error('ID de reserva no proporcionado');
        }

        // Cargar datos de la reserva
        const res = await fetch(`/api/reservations/${reservationId}`);
        if (!res.ok) {
          throw new Error('Reserva no encontrada');
        }
        const reservationData = await res.json();
        setReservation(reservationData);

        // Cargar QR code
        const qrRes = await fetch(`/api/orders/${reservationId}/pass`);
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          setQrCodeDataUrl(qrData.qrCodeDataUrl);
        }

      } catch (e: any) {
        console.error('Error cargando pase:', e);
        setError(e?.message || 'Error cargando el pase');
      } finally {
        setLoading(false);
      }
    }

    if (reservationId) {
      loadReservationPass();
    }
  }, [reservationId]);

  const downloadPDF = async () => {
    try {
      const response = await fetch(`/api/reservations/${reservationId}/pass`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pase-acceso-${reservationId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error descargando el PDF');
    }
  };

  const sharePass = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pase de Acceso - Polideportivo Victoria Hernández',
          text: `Mi reserva para ${reservation?.court.name} el ${new Date(reservation?.startTime || '').toLocaleDateString('es-ES')}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copiar URL al clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('URL copiada al portapapeles');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pase de acceso...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const startTime = new Date(reservation.startTime);
  const endTime = new Date(reservation.endTime);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Reservas
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            IDB Victoria Hernández
          </h1>
          <p className="text-gray-600 mt-2">
            Pase de Acceso Digital - {reservation.court.name}
          </p>
        </div>

        {/* Pase Digital Principal - Diseño Mejorado */}
        <div className="max-w-md mx-auto">
          <Card className="overflow-hidden shadow-2xl border-0">
            {/* Header del Pase */}
            <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">IDB VICTORIA HERNÁNDEZ</h1>
                <p className="text-slate-300 text-sm mb-4">Centro Deportivo Premium</p>
                <div className="inline-block bg-slate-700 text-slate-200 px-4 py-2 rounded-full text-xs font-medium">
                  PASE DE ACCESO DIGITAL
                </div>
              </div>
            </CardHeader>
            
                <CardContent className="p-8 space-y-10">
              {/* Información de la Cancha */}
              <div className="text-center space-y-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">CANCHA</p>
                  <h2 className="text-xl font-bold text-gray-900">
                    {reservation.court.name}
                  </h2>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">DEPORTE</p>
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">
                    FOOTBALL
                  </p>
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="bg-gray-50 rounded-2xl p-6 text-center space-y-2">
                <p className="text-lg font-semibold text-gray-900">
                  {startTime.toLocaleDateString('es-ES', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

                  {/* QR Code con mejor diseño */}
                  {qrCodeDataUrl && (
                    <div className="text-center space-y-6">
                      <div className="inline-block p-5 bg-white rounded-2xl shadow-xl border-2 border-gray-100">
                        <img 
                          src={qrCodeDataUrl} 
                          alt="QR Code de acceso" 
                          className="w-32 h-32 mx-auto"
                        />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        Código: #{reservation.id.slice(0, 10).toUpperCase()}
                      </p>
                    </div>
                  )}

              {/* Información del Usuario */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center space-y-5">
                <h3 className="font-bold text-gray-900 text-lg">
                  {reservation.user?.name || 'Usuario'}
                </h3>
                <p className="text-sm text-gray-600">
                  Código: #{reservation.id.slice(0, 10).toUpperCase()}
                </p>
                <p className="text-sm text-gray-600">
                  Válido hasta: {endTime.toLocaleDateString('es-ES')} {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-green-500 text-white shadow-lg">
                    RESERVA PAGADA
                  </span>
                </div>
              </div>

                  {/* Botones de Acción */}
                  <div className="grid grid-cols-2 gap-8">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white py-6 rounded-xl font-bold shadow-xl text-sm border-2 border-green-700 h-16"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Calendario
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700 text-white py-6 rounded-xl font-bold shadow-xl text-sm border-2 border-purple-700 h-16"
                    >
                      <Smartphone className="w-5 h-5 mr-2" />
                      Wallet
                    </Button>
                  </div>

              {/* Instrucciones */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <p className="text-sm text-amber-800 text-center font-medium">
                  📱 Presenta este código QR al personal de acceso
                </p>
              </div>
            </CardContent>

            {/* Footer del Pase */}
            <div className="bg-gray-50 p-6 text-center">
              <p className="text-xs text-gray-500 mb-2">
                Para soporte técnico: info@polideportivovictoriahernandez.es
              </p>
              <p className="text-xs text-gray-400">
                © 2024 IDB Victoria Hernández • Todos los derechos reservados
              </p>
            </div>
          </Card>
        </div>

        {/* Panel de Acciones Adicionales */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Acciones Rápidas */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center text-blue-800">
                  <Share2 className="w-5 h-5 mr-2" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button onClick={downloadPDF} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                
                <Button onClick={sharePass} variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-medium">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir Pase
                </Button>
              </CardContent>
            </Card>

            {/* Instrucciones Detalladas */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                <CardTitle className="flex items-center text-amber-800">
                  📋 Instrucciones de Uso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <p className="text-sm text-gray-700 pt-1">Presenta este código QR al personal de acceso en la entrada</p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <p className="text-sm text-gray-700 pt-1">El código es válido únicamente para la fecha y hora indicada</p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <p className="text-sm text-gray-700 pt-1">Agrega el pase a tu wallet móvil para acceso rápido</p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    <p className="text-sm text-gray-700 pt-1">Mantén tu dispositivo cargado para mostrar el código</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Soporte */}
          <div className="mt-8">
            <Card className="shadow-lg border-l-4 border-l-green-500">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center text-green-800">
                  🆘 Soporte Técnico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  ¿Problemas con tu pase? Contáctanos:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-4 bg-white rounded-lg shadow">
                    <p className="font-semibold text-gray-900 mb-1">📧 Email</p>
                    <p className="text-gray-600">info@polideportivovictoriahernandez.es</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow">
                    <p className="font-semibold text-gray-900 mb-1">📞 Teléfono</p>
                    <p className="text-gray-600">+34 123 456 789</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow">
                    <p className="font-semibold text-gray-900 mb-1">🕒 Horario</p>
                    <p className="text-gray-600">Lunes a Viernes<br/>9:00 - 18:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
