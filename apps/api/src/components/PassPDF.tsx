import { Document, Page, Text, View, Image, StyleSheet, Font, Link } from '@react-pdf/renderer';

// Registrar fuentes (opcional - react-pdf incluye fuentes básicas)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf',
// });

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f8fafc',
    padding: 0,
    position: 'relative',
  },
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 25,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
    display: 'none', // Eliminar "Centro Deportivo Premium"
  },
  passLabel: {
    fontSize: 10,
    color: '#e2e8f0',
    textAlign: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  mainContent: {
    flex: 1,
    padding: 25,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  reservationInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    border: '1px solid #e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  courtName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  courtLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sportType: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sportLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTime: {
    fontSize: 14,
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrFrame: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    border: '2px solid #e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  qrImage: {
    width: 120,
    height: 120,
  },
  userInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    border: '1px solid #e2e8f0',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 10,
  },
  reservationCode: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 10,
  },
  validUntil: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 14,
  },
  status: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 12,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  instructions: {
    fontSize: 9,
    color: '#64748b',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 12,
    gap: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 10,
    textAlign: 'center',
    minWidth: 85,
    fontWeight: 'bold',
  },
  calendarButton: {
    backgroundColor: '#059669',
  },
  walletButton: {
    backgroundColor: '#7c3aed',
  },
  footer: {
    backgroundColor: '#f1f5f9',
    padding: 14,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
});

interface PassPDFProps {
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
    startTime: Date;
    endTime: Date;
    status: string;
  };
  qrDataUrl: string;
  expiresAt: Date;
  statusLabel: string;
}

export default function PassPDF({ reservation, qrDataUrl, expiresAt, statusLabel }: PassPDFProps) {
  const centerName = reservation.court.center?.name || 'IDB VICTORIA HERNÁNDEZ';
  const code = reservation.id.slice(0, 10).toUpperCase();
  
  // Deporte real: usar el seleccionado en la reserva o el tipo de la cancha
  const sportType = (reservation as any)?.sport || (reservation.court as any)?.sportType || 'DEPORTE';

  const dateStr = reservation.startTime.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    timeZone: 'Europe/Madrid'
  });
  const timeStr = reservation.startTime.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Europe/Madrid'
  });
  const endTimeStr = reservation.endTime.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Europe/Madrid'
  });

  // Generar URLs para acciones
  const calendarUrl = generateGoogleCalendarUrl(reservation);
  const walletUrl = generateWalletPassUrl(reservation);

  return (
    <Document>
      <Page size={[400, 600]} style={styles.page}>
        <View style={styles.container}>
          {/* Header Profesional */}
          <View style={styles.header}>
            <Text style={styles.logo}>IDB VICTORIA HERNÁNDEZ</Text>
            <Text style={styles.passLabel}>PASE DE ACCESO DIGITAL</Text>
          </View>

          {/* Contenido Principal */}
          <View style={styles.mainContent}>
            {/* Información de Reserva */}
            <View style={styles.reservationInfo}>
              <Text style={styles.courtLabel}>CANCHA</Text>
              <Text style={styles.courtName}>
                {reservation.court.name}
              </Text>
              <Text style={styles.sportLabel}>DEPORTE</Text>
              <Text style={styles.sportType}>{sportType}</Text>
              <Text style={styles.dateTime}>
                {dateStr} • {timeStr} - {endTimeStr}
              </Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrFrame}>
                <Image src={qrDataUrl} style={styles.qrImage} />
              </View>
            </View>

            {/* Información del Usuario */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {reservation.user?.name || 'Usuario'}
              </Text>
              <Text style={styles.reservationCode}>
                Código: #{code}
              </Text>
              <Text style={styles.validUntil}>
                Válido hasta: {expiresAt.toLocaleDateString('es-ES')} {expiresAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.status}>{statusLabel}</Text>
              
              {/* Botones de Acción */}
              <View style={styles.actionButtons}>
                <Link src={calendarUrl} style={[styles.button, styles.calendarButton]}>
                  📅 Agregar al Calendario
                </Link>
                <Link src={walletUrl} style={[styles.button, styles.walletButton]}>
                  💳 Agregar a Wallet
                </Link>
              </View>
            </View>

            {/* Instrucciones */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructions}>
                Presenta este código QR al personal de acceso
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Para soporte técnico: info@polideportivovictoriahernandez.es
            </Text>
            <Text style={styles.footerText}>
              © 2024 IDB Victoria Hernández • Todos los derechos reservados
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Función para generar URL de Google Calendar
function generateGoogleCalendarUrl(reservation: any): string {
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);
  
  const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const title = encodeURIComponent(`Reserva - ${reservation.court.name}`);
  const details = encodeURIComponent(`Reserva deportiva en ${reservation.court.center?.name || 'IDB Victoria Hernández'}`);
  const location = encodeURIComponent(reservation.court.center?.name || 'IDB Victoria Hernández');
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

// Función para generar URL de Wallet (Apple Wallet / Google Pay)
function generateWalletPassUrl(reservation: any): string {
  // Para Apple Wallet, necesitaríamos un archivo .pkpass
  // Para Google Pay, necesitaríamos integrar con Google Pay API
  // Por ahora, redirigimos a la página de la reserva
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://www.polideportivovictoriahernandez.es';
  return `${webUrl}/dashboard/reservations/${reservation.id}`;
}
