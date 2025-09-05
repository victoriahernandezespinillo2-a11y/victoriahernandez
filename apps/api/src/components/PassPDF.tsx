import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// Registrar fuentes (opcional - react-pdf incluye fuentes básicas)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf',
// });

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#667eea',
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    padding: 0,
    position: 'relative',
  },
  container: {
    width: '100%',
    height: '100%',
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  passLabel: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 10,
  },
  divider: {
    width: 280,
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.2,
    marginVertical: 10,
  },
  courtInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  courtName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  sportType: {
    fontSize: 14,
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 10,
  },
  dateTime: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrFrame: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  reservationCode: {
    fontSize: 14,
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 5,
  },
  validUntil: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 5,
  },
  status: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 11,
    color: '#94a3b8',
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
  const centerName = reservation.court.center?.name || 'POLIDEPORTIVO';
  const code = reservation.id.slice(0, 10).toUpperCase();
  
  // Deporte real: usar el seleccionado en la reserva o el tipo de la cancha
  const sportType = (reservation as any)?.sport || (reservation.court as any)?.sportType || 'DEPORTE';

  const dateStr = reservation.startTime.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const timeStr = reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = reservation.endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <Document>
      <Page size={[400, 600]} style={styles.page}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{String(centerName).toUpperCase()}</Text>
            <Text style={styles.passLabel}>PASE DE ACCESO</Text>
            <View style={styles.divider} />
          </View>

          {/* Court Info */}
          <View style={styles.courtInfo}>
            <Text style={styles.courtName}>
              CANCHA {reservation.court.name.split(' ').pop() || '1'}
            </Text>
            <Text style={styles.sportType}>{sportType}</Text>
            <Text style={styles.dateTime}>
              {dateStr} {timeStr} – {endTimeStr}
            </Text>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrFrame}>
              <Image src={qrDataUrl} style={styles.qrImage} />
            </View>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {reservation.user?.name || 'Usuario'}
            </Text>
            <Text style={styles.reservationCode}>
              Código: #{code}
            </Text>
            <Text style={styles.validUntil}>
              Válido hasta: {expiresAt.toLocaleString('es-ES')}
            </Text>
            <Text style={styles.status}>{statusLabel}</Text>
            <Text style={styles.instructions}>
              Presenta este código al personal de acceso
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
