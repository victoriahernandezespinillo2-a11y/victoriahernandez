'use client';

export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Estás sin conexión</h1>
        <p className="text-gray-600 mb-4">Algunas funciones no estarán disponibles. Intenta reconectar para continuar.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Reintentar
        </button>
      </div>
    </div>
  );
}