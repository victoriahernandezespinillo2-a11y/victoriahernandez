'use client';

import { useState } from 'react';
import { Button } from '@repo/ui/button';

interface WalletPassGeneratorProps {
  reservation: {
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
  };
  qrCodeDataUrl?: string;
}

export default function WalletPassGenerator({ reservation, qrCodeDataUrl }: WalletPassGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAppleWalletPass = async () => {
    setIsGenerating(true);
    try {
      // Generar un pase básico para Apple Wallet
      const passData = {
        formatVersion: 1,
        passTypeIdentifier: 'pass.com.polideportivovictoriahernandez.access',
        serialNumber: reservation.id,
        teamIdentifier: 'polideportivovictoriahernandez',
        organizationName: 'IDB Victoria Hernández',
        description: 'Pase de Acceso Deportivo',
        logoText: 'IDB Victoria Hernández',
        foregroundColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(30, 41, 59)',
        labelColor: 'rgb(255, 255, 255)',
        barcode: {
          message: reservation.id,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1'
        },
        relevantDate: new Date(reservation.startTime).toISOString(),
        expirationDate: new Date(reservation.endTime).toISOString(),
        voided: false,
        generic: {
          primaryFields: [
            {
              key: 'court',
              label: 'CANCHA',
              value: reservation.court.name
            }
          ],
          secondaryFields: [
            {
              key: 'sport',
              label: 'DEPORTE',
              value: 'FOOTBALL'
            }
          ],
          auxiliaryFields: [
            {
              key: 'user',
              label: 'USUARIO',
              value: reservation.user?.name || 'Usuario'
            },
            {
              key: 'code',
              label: 'CÓDIGO',
              value: reservation.id.slice(0, 10).toUpperCase()
            }
          ],
          backFields: [
            {
              key: 'instructions',
              label: 'INSTRUCCIONES',
              value: 'Presenta este pase al personal de acceso. Válido únicamente para la fecha y hora indicada.'
            },
            {
              key: 'contact',
              label: 'CONTACTO',
              value: 'info@polideportivovictoriahernandez.es'
            }
          ]
        }
      };

      // Crear un blob con los datos del pase
      const blob = new Blob([JSON.stringify(passData)], { type: 'application/vnd.apple.pkpass' });
      const url = URL.createObjectURL(blob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `pase-acceso-${reservation.id}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generando pase de Apple Wallet:', error);
      alert('Error generando el pase. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addToGooglePay = () => {
    // Para Google Pay, necesitaríamos integrar con la API oficial
    // Por ahora, redirigimos a la página de la reserva
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || window.location.origin;
    window.open(`${webUrl}/dashboard/reservations/${reservation.id}`, '_blank');
  };

  const addToCalendar = () => {
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    
    const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const title = encodeURIComponent(`Reserva - ${reservation.court.name}`);
    const details = encodeURIComponent(`Reserva deportiva en ${reservation.court.center?.name || 'IDB Victoria Hernández'}`);
    const location = encodeURIComponent(reservation.court.center?.name || 'IDB Victoria Hernández');
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
    
    window.open(calendarUrl, '_blank');
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📱 Agregar a Dispositivo Móvil
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Apple Wallet */}
        <Button
          onClick={generateAppleWalletPass}
          disabled={isGenerating}
          className="flex items-center justify-center space-x-2 bg-black text-white hover:bg-gray-800 transition-colors"
        >
          <span className="text-lg">💳</span>
          <div className="text-left">
            <div className="font-medium">Apple Wallet</div>
            <div className="text-xs opacity-80">iPhone</div>
          </div>
        </Button>

        {/* Google Pay */}
        <Button
          onClick={addToGooglePay}
          className="flex items-center justify-center space-x-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <span className="text-lg">📱</span>
          <div className="text-left">
            <div className="font-medium">Google Pay</div>
            <div className="text-xs opacity-80">Android</div>
          </div>
        </Button>

        {/* Calendario */}
        <Button
          onClick={addToCalendar}
          className="flex items-center justify-center space-x-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <span className="text-lg">📅</span>
          <div className="text-left">
            <div className="font-medium">Calendario</div>
            <div className="text-xs opacity-80">Google</div>
          </div>
        </Button>
      </div>

      {isGenerating && (
        <div className="text-center text-sm text-gray-600">
          Generando pase para Apple Wallet...
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• <strong>Apple Wallet:</strong> Descarga un archivo .pkpass compatible con iPhone</p>
        <p>• <strong>Google Pay:</strong> Abre la página de la reserva para agregar manualmente</p>
        <p>• <strong>Calendario:</strong> Agrega el evento directamente a Google Calendar</p>
      </div>
    </div>
  );
}
