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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pase Principal */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardTitle className="flex items-center justify-between">
                  <span>IDB Victoria Hernández</span>
                  <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                    PASE DIGITAL
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Información de la Reserva */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {reservation.court.name}
                  </h2>
                  <p className="text-gray-600 mb-4">FOOTBALL</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-lg font-semibold text-gray-900">
                      {startTime.toLocaleDateString('es-ES', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-gray-600">
                      {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="text-center mb-6">
                    <div className="inline-block p-4 bg-white rounded-xl shadow-lg border-2 border-gray-200">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code de acceso" 
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Código: #{reservation.id.slice(0, 10).toUpperCase()}
                    </p>
                  </div>
                )}

                {/* Información del Usuario */}
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="font-semibold text-gray-900">
                    {reservation.user?.name || 'Usuario'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Válido hasta: {endTime.toLocaleDateString('es-ES')} {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {reservation.status === 'PAID' ? 'RESERVA PAGADA' : reservation.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acciones Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="w-5 h-5 mr-2" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={downloadPDF} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                
                <Button onClick={sharePass} variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir Pase
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Panel de Wallet y Calendario */}
          <div className="space-y-6">
            {reservation && (
              <WalletPassGenerator 
                reservation={reservation} 
                qrCodeDataUrl={qrCodeDataUrl}
              />
            )}

            {/* Instrucciones */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Instrucciones de Uso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                    <p>Presenta este código QR al personal de acceso en la entrada</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                    <p>El código es válido únicamente para la fecha y hora indicada</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">3</span>
                    <p>Agrega el pase a tu wallet móvil para acceso rápido</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">4</span>
                    <p>Mantén tu dispositivo cargado para mostrar el código</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacto de Soporte */}
            <Card>
              <CardHeader>
                <CardTitle>🆘 Soporte Técnico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  ¿Problemas con tu pase? Contáctanos:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email:</strong> info@polideportivovictoriahernandez.es</p>
                  <p><strong>Teléfono:</strong> +34 123 456 789</p>
                  <p><strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
