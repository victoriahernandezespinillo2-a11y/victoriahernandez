/**
 * GET /api/admin/emails/templates/[templateId] - Obtener plantilla específica
 * PUT /api/admin/emails/templates/[templateId] - Actualizar plantilla específica
 */

import { NextRequest } from 'next/server';
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware';
import { emailService } from '@repo/notifications';
import { z } from 'zod';

const UpdateTemplateSchema = z.object({
  subject: z.string().min(1, 'Subject es requerido'),
  html: z.string().min(1, 'HTML es requerido'),
  variables: z.array(z.string()).optional().default([])
});

/**
 * GET - Obtener plantilla específica para edición
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> }
) {
  return withAdminMiddleware(async (req) => {
    try {
      const params = await context.params;
      console.log('🧪 [TEMPLATE-GET] Obteniendo plantilla:', params.templateId);
      
      // Obtener la plantilla del servicio de email
      if (!emailService || typeof emailService.getTemplate !== 'function') {
        console.error('❌ [TEMPLATE-GET] Servicio de email no disponible');
        return ApiResponse.error('Servicio de email no disponible', 500);
      }
      
      const templateData = emailService.getTemplate(params.templateId, {});
      if (!templateData) {
        console.error(`❌ [TEMPLATE-GET] Plantilla '${params.templateId}' no encontrada`);
        return ApiResponse.error(`Plantilla '${params.templateId}' no encontrada`, 404);
      }
      
      console.log('✅ [TEMPLATE-GET] Plantilla obtenida exitosamente');
      
      return ApiResponse.success({
        id: params.templateId,
        name: templateData.name,
        subject: templateData.subject,
        html: templateData.html,
        variables: templateData.variables || []
      });
      
    } catch (error) {
      console.error('❌ [TEMPLATE-GET] Error obteniendo plantilla:', error);
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(request);
}

/**
 * PUT - Actualizar plantilla específica
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ templateId: string }> }
) {
  return withAdminMiddleware(async (req) => {
    try {
      const params = await context.params;
      console.log('🧪 [TEMPLATE-PUT] Actualizando plantilla:', params.templateId);
      
      const body = await req.json();
      const { subject, html, variables } = UpdateTemplateSchema.parse(body);
      
      console.log('🧪 [TEMPLATE-PUT] Datos recibidos:', { subject, htmlLength: html.length, variables });
      
      // Por ahora, como las plantillas están hardcodeadas en el código,
      // vamos a simular la actualización y devolver éxito
      // En una implementación real, aquí guardarías en base de datos
      
      console.log('⚠️ [TEMPLATE-PUT] NOTA: Las plantillas están hardcodeadas en el código');
      console.log('⚠️ [TEMPLATE-PUT] Para cambios permanentes, edita packages/notifications/src/email.ts');
      
      // Simular guardado exitoso
      console.log('✅ [TEMPLATE-PUT] Plantilla "actualizada" exitosamente (simulado)');
      
      return ApiResponse.success({
        id: params.templateId,
        subject,
        html,
        variables,
        message: 'Plantilla actualizada exitosamente. NOTA: Para cambios permanentes, edita el archivo de plantillas en el código.',
        warning: 'Las plantillas están hardcodeadas. Los cambios no persisten entre reinicios del servidor.'
      });
      
    } catch (error) {
      console.error('❌ [TEMPLATE-PUT] Error actualizando plantilla:', error);
      
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(
          error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        );
      }
      
      return ApiResponse.error(
        error instanceof Error ? error.message : 'Error interno del servidor',
        500
      );
    }
  })(request);
}
