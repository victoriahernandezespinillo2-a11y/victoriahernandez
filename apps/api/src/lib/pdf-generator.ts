/**
 * Generador de PDFs robusto para el sistema de reservas
 * Maneja diferentes entornos de Node.js y módulos
 */

export interface PDFGeneratorOptions {
  margin?: number;
  size?: 'A4' | 'A3' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export interface ReservationData {
  id: string;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  paymentMethod?: string;
  user?: {
    name?: string;
    email?: string;
  };
  court?: {
    name: string;
    center?: {
      name: string;
      email?: string;
      phone?: string;
      settings?: any;
    };
  };
}

export class PDFGenerator {
  private PDFDocument: any;
  private isInitialized = false;

  constructor() {
    this.initializePDFKit();
  }

  private async initializePDFKit() {
    if (this.isInitialized) return;

    try {
      // Método 1: Importación directa de ES modules
      const pdfkitModule = await import('pdfkit');
      this.PDFDocument = pdfkitModule.default || pdfkitModule;
      
      if (typeof this.PDFDocument !== 'function') {
        throw new Error('PDFDocument no es una función constructora');
      }
      
      this.isInitialized = true;
      console.log('✅ PDFKit cargado exitosamente via ES modules');
    } catch (error) {
      console.error('❌ Error cargando PDFKit via ES modules:', error);
      
      try {
        // Método 2: Usar createRequire si está disponible
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        this.PDFDocument = require('pdfkit');
        
        if (typeof this.PDFDocument !== 'function') {
          throw new Error('PDFDocument no es una función constructora');
        }
        
        this.isInitialized = true;
        console.log('✅ PDFKit cargado exitosamente via createRequire');
      } catch (fallbackError) {
        console.error('❌ Error cargando PDFKit via createRequire:', fallbackError);
        
        try {
          // Método 3: Usar require global si está disponible
          if (typeof require !== 'undefined') {
            this.PDFDocument = require('pdfkit');
            
            if (typeof this.PDFDocument !== 'function') {
              throw new Error('PDFDocument no es una función constructora');
            }
            
            this.isInitialized = true;
            console.log('✅ PDFKit cargado exitosamente via require global');
          } else {
            throw new Error('No se encontró método para cargar PDFKit');
          }
        } catch (globalError) {
          console.error('❌ Error cargando PDFKit via require global:', globalError);
          throw new Error(`No se pudo cargar PDFKit. Todos los métodos fallaron. Último error: ${globalError instanceof Error ? globalError.message : 'Error desconocido'}`);
        }
      }
    }
  }

  async generateReceipt(reservation: ReservationData, options: PDFGeneratorOptions = {}): Promise<Buffer> {
    if (!this.isInitialized) {
      await this.initializePDFKit();
    }

    if (!this.PDFDocument) {
      throw new Error('PDFKit no está inicializado');
    }

    const {
      margin = 50,
      size = 'A4',
      orientation = 'portrait'
    } = options;

    // Configuración robusta de PDFKit para evitar errores de fuentes
    const doc = new this.PDFDocument({ 
      margin, 
      size, 
      orientation,
      // Configuración para evitar errores de fuentes
      autoFirstPage: true,
      bufferPages: true
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error: Error) => reject(error));
    });

    try {
      // Generar contenido del PDF
      await this.generateReceiptContent(doc, reservation);
      doc.end();
      
      return await bufferPromise;
    } catch (error) {
      doc.destroy?.();
      throw error;
    }
  }

  private async generateReceiptContent(doc: any, reservation: ReservationData) {
    // Configuración dinámica desde el centro
    const centerSettings: any = reservation.court?.center?.settings || {};
    const receiptCfg: any = centerSettings.receipt || {};
    const legalName: string | undefined = receiptCfg.legalName || centerSettings.legalName;
    const taxId: string | undefined = receiptCfg.taxId || centerSettings.taxId;
    const fiscalAddress: string | undefined = receiptCfg.fiscalAddress || centerSettings.fiscalAddress;
    const contactEmail: string | undefined = receiptCfg.contactEmail || reservation.court?.center?.email || centerSettings.contactEmail;
    const contactPhone: string | undefined = receiptCfg.contactPhone || reservation.court?.center?.phone || centerSettings.contactPhone;
    const footerNotes: string | undefined = receiptCfg.footerNotes;
    const showStripeReferences: boolean = !!receiptCfg.showStripeReferences;

    // Encabezado
    doc.fontSize(16).text(legalName || 'Recibo de Reserva', { align: 'center' });
    if (taxId) doc.fontSize(9).text(`CIF/NIF: ${taxId}`, { align: 'center' });
    if (fiscalAddress) doc.fontSize(9).text(fiscalAddress, { align: 'center' });
    doc.moveDown(1);
    
    // Información de la reserva
    doc.fontSize(10).text(`Centro: ${reservation.court?.center?.name || 'N/A'}`);
    doc.text(`Cancha: ${reservation.court?.name || 'N/A'}`);
    doc.text(`Cliente: ${reservation.user?.name || ''} - ${reservation.user?.email || ''}`);
    doc.text(`Fecha: ${reservation.startTime.toLocaleDateString('es-ES')} ${reservation.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`);
    doc.text(`Duración: ${Math.round((reservation.endTime.getTime() - reservation.startTime.getTime()) / 60000)} min`);

    // Método de pago
    const paymentMethod = reservation.paymentMethod || 'N/D';
    doc.text(`Método de pago: ${paymentMethod}`);
    doc.moveDown(1);
    
    // Sección de importes
    doc.fontSize(12).text(`Número: ${reservation.id.slice(0, 10).toUpperCase()}`, { align: 'right' });
    doc.moveDown(1);
    doc.fontSize(12).text(`Total: €${reservation.totalPrice.toFixed(2)}`, { align: 'right' });

    // Contacto y notas
    if (contactEmail || contactPhone) {
      doc.moveDown(1);
      if (contactEmail) doc.fontSize(9).text(`Contacto: ${contactEmail}`);
      if (contactPhone) doc.fontSize(9).text(`Teléfono: ${contactPhone}`);
    }
    
    if (footerNotes) {
      doc.moveDown(1);
      doc.fontSize(9).text(String(footerNotes));
    }
  }
}

// Instancia singleton para reutilizar la inicialización
let pdfGeneratorInstance: PDFGenerator | null = null;

export async function getPDFGenerator(): Promise<PDFGenerator> {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PDFGenerator();
  }
  return pdfGeneratorInstance;
}
