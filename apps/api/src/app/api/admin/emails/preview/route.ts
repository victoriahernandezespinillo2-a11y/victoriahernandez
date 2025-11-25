/**
 * POST /api/admin/emails/preview
 * Genera vista previa de plantillas de email
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { emailService } from '@repo/notifications';
import { z } from 'zod';

const PreviewEmailSchema = z.object({
  template: z.string().min(1, 'Template es requerido'),
  variables: z.record(z.any()).optional().default({})
});

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      console.log('🧪 [EMAIL-PREVIEW] Iniciando preview de plantilla...');
      
      const body = await req.json();
      console.log('🧪 [EMAIL-PREVIEW] Body recibido:', body);
      
      const { template, variables } = PreviewEmailSchema.parse(body);
      console.log('🧪 [EMAIL-PREVIEW] Template:', template, 'Variables:', variables);
      
      // Obtener la plantilla del servicio de email
      if (!emailService || typeof emailService.getTemplate !== 'function') {
        console.error('❌ [EMAIL-PREVIEW] Servicio de email no disponible');
        return ApiResponse.error('Servicio de email no disponible', 500);
      }
      
      console.log('🧪 [EMAIL-PREVIEW] Obteniendo plantilla...');
      const templateData = emailService.getTemplate(template, variables);
      console.log('🧪 [EMAIL-PREVIEW] Template data:', templateData ? 'encontrada' : 'no encontrada');
      
      if (!templateData) {
        console.error(`❌ [EMAIL-PREVIEW] Plantilla '${template}' no encontrada`);
        return ApiResponse.error(`Plantilla '${template}' no encontrada`, 404);
      }
      
      // Reemplazar variables en el HTML
      let html = templateData.html;
      let subject = templateData.subject;
      
      // Reemplazar variables con formato {{variable}}
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        const stringValue = String(value || `[${key}]`);
        html = html.replace(new RegExp(placeholder, 'g'), stringValue);
        subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
      });
      
      // Reemplazar variables no definidas con placeholders
      html = html.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        return `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 3px; font-size: 12px;">[${varName}]</span>`;
      });
      
      // Asegurar que todo el texto sea negro y legible
      html = html.replace(/<div([^>]*)>/g, (match, attributes) => {
        // Si ya tiene color, no lo cambiamos
        if (attributes.includes('color:')) {
          return match;
        }
        // Agregar color negro por defecto
        const newAttributes = attributes ? attributes + ' style="color: #000000;"' : ' style="color: #000000;"';
        return `<div${newAttributes}>`;
      });
      
      // Asegurar que los párrafos sin color explícito sean negros
      html = html.replace(/<p(?![^>]*color:)([^>]*)>/g, (match, attributes) => {
        const style = attributes.includes('style=') 
          ? attributes.replace(/style="([^"]*)"/, 'style="$1; color: #000000;"')
          : attributes + ' style="color: #000000;"';
        return `<p${style}>`;
      });
      
      // Envolver el HTML en un contenedor con estilos base para asegurar legibilidad
      const wrappedHtml = `
        <div style="font-family: Arial, sans-serif; color: #000000; line-height: 1.6; background-color: #ffffff; padding: 20px;">
          ${html}
        </div>
      `;
      
      console.log('✅ [EMAIL-PREVIEW] Preview generado exitosamente');
      
      return ApiResponse.success({
        html: wrappedHtml,
        subject,
        template: templateData.name,
        variables: templateData.variables || []
      });
      
    } catch (error) {
      console.error('❌ [EMAIL-PREVIEW] Error generando preview de email:', error);
      
      if (error instanceof z.ZodError) {
        console.error('❌ [EMAIL-PREVIEW] Error de validación:', error.errors);
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
      console.error('❌ [EMAIL-PREVIEW] Error final:', errorMessage);
      
      return ApiResponse.error(errorMessage, 500);
    }
  })(request);
}
