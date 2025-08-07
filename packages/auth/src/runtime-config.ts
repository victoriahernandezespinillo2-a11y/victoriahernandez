// Configuración de runtime para el módulo auth
// Este archivo asegura que el módulo use Node.js Runtime

export const RUNTIME_CONFIG = {
  // Forzar Node.js Runtime para todas las funciones que usan bcryptjs
  forceNodeRuntime: true,
  
  // Lista de funciones que requieren Node.js Runtime
  nodeRuntimeFunctions: [
    'hashPassword',
    'verifyPassword',
    'createUser',
    'authorize'
  ]
};

// Configuración para Next.js
export const NEXT_RUNTIME_CONFIG = {
  // Configurar para usar Node.js Runtime por defecto
  runtime: 'nodejs' as const,
  
  // Paquetes externos que requieren Node.js Runtime
  serverComponentsExternalPackages: ['bcryptjs', 'pg']
};
