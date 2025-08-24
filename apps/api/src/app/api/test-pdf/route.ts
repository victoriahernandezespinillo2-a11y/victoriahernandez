import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Importación dinámica de PDFDocument
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const PDFDocument = require('pdfkit');

    const doc = new PDFDocument({ margin: 50 });
    const chunks: any[] = [];
    doc.on('data', (c: any) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks as any))));

    // Crear un PDF simple de prueba
    doc.fontSize(20).text('PDF de Prueba', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Este es un PDF de prueba para verificar que la generación funciona correctamente.');
    doc.moveDown();
    doc.text(`Fecha: ${new Date().toLocaleString('es-ES')}`);
    doc.moveDown();
    doc.text('✅ Si puedes ver este PDF, la generación funciona correctamente.');

    doc.end();
    const buffer = await done;
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=test.pdf',
      },
    });
  } catch (error) {
    console.error('Error generando PDF de prueba:', error);
    return new Response(`Error generando PDF: ${error}`, { status: 500 });
  }
}
