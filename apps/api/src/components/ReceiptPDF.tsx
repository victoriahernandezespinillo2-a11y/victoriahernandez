import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 50,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 9,
    marginBottom: 2,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  value: {
    fontSize: 10,
  },
  rightAlign: {
    textAlign: 'right',
    fontSize: 12,
    marginBottom: 3,
  },
  total: {
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    fontSize: 9,
  },
});

interface ReceiptPDFProps {
  reservation: {
    id: string;
    court: {
      name: string;
      center: {
        name: string;
        email?: string | null;
        phone?: string | null;
      };
    };
    startTime: Date;
    endTime: Date;
    totalPrice: number;
    paymentMethod?: string | null;
  };
  centerSettings: {
    legalName?: string;
    taxId?: string;
    fiscalAddress?: string;
    contactEmail?: string;
    contactPhone?: string;
    footerNotes?: string;
  };
  total: number;
  sumOverrides: number;
  reasons: string[];
}

export default function ReceiptPDF({ 
  reservation, 
  centerSettings, 
  total, 
  sumOverrides, 
  reasons 
}: ReceiptPDFProps) {
  const legalName = centerSettings.legalName || 'Recibo de Reserva';
  const taxId = centerSettings.taxId;
  const fiscalAddress = centerSettings.fiscalAddress;
  const contactEmail = centerSettings.contactEmail || reservation.court.center.email;
  const contactPhone = centerSettings.contactPhone || reservation.court.center.phone;
  const footerNotes = centerSettings.footerNotes;
  
  const paymentMethod = reservation.paymentMethod || 'N/D';
  const duration = Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000);
  const base = total - sumOverrides;
  const reservationCode = reservation.id.slice(0, 10).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{legalName}</Text>
          {taxId && <Text style={styles.subtitle}>CIF/NIF: {taxId}</Text>}
          {fiscalAddress && <Text style={styles.subtitle}>{fiscalAddress}</Text>}
        </View>

        {/* Información de la reserva */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Centro:</Text>
            <Text style={styles.value}>{reservation.court.center.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cancha:</Text>
            <Text style={styles.value}>{reservation.court.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>
              {reservation.startTime.toLocaleDateString('es-ES')} {' '}
              {reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duración:</Text>
            <Text style={styles.value}>{duration} min</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Método de pago:</Text>
            <Text style={styles.value}>{paymentMethod}</Text>
          </View>
        </View>

        {/* Número de reserva */}
        <Text style={styles.rightAlign}>Número: {reservationCode}</Text>

        {/* Desglose de precio */}
        <View style={styles.section}>
          <Text style={styles.rightAlign}>Base: €{base.toFixed(2)}</Text>
          {sumOverrides !== 0 && (
            <>
              <Text style={styles.rightAlign}>Ajustes: €{sumOverrides.toFixed(2)}</Text>
              {reasons.length > 0 && (
                <Text style={[styles.rightAlign, { fontSize: 9 }]}>
                  Motivos: {reasons.join(' | ')}
                </Text>
              )}
            </>
          )}
          <Text style={styles.total}>Total: €{total.toFixed(2)}</Text>
        </View>

        {/* Información de contacto */}
        {(contactEmail || contactPhone) && (
          <View style={styles.footer}>
            {contactEmail && <Text>Contacto: {contactEmail}</Text>}
            {contactPhone && <Text>Teléfono: {contactPhone}</Text>}
          </View>
        )}

        {/* Notas del pie */}
        {footerNotes && (
          <View style={styles.footer}>
            <Text>{footerNotes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
