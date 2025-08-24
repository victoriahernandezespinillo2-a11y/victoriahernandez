import { NextRequest } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { withAdminMiddleware, ApiResponse } from '@/lib/middleware'

export const runtime = 'nodejs'

const SignSchema = z.object({
  folder: z.string().min(1).default('products'),
  // paramsToSign es opcional y puede contener cualquier par clave-valor que el widget quiera firmar
  paramsToSign: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  return withAdminMiddleware(async (req) => {
    try {
      const body = await req.json().catch(() => ({}))
      const { folder, paramsToSign } = SignSchema.parse(body || {})

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME
      const apiKey = process.env.CLOUDINARY_API_KEY
      const apiSecret = process.env.CLOUDINARY_API_SECRET

      if (!cloudName || !apiKey || !apiSecret) {
        return ApiResponse.internalError('Cloudinary no está configurado. Falta CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET')
      }

      // Partimos de los params que nos pasa el widget, pero siempre forzamos la carpeta y aseguramos timestamp
      const params: Record<string, string | number> = {
        ...(paramsToSign || {}),
        folder,
      }
      if (!params.timestamp) {
        params.timestamp = Math.floor(Date.now() / 1000)
      }

      const toSign = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&')

      const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')

      return ApiResponse.success({ signature, timestamp: params.timestamp, apiKey, cloudName, folder })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponse.validation(error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })))
      }
      return ApiResponse.internalError('Error generando firma de subida')
    }
  })(request)
}

export async function OPTIONS() {
  return ApiResponse.success(null)
}