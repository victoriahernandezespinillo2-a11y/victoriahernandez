export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Polideportivo API</h1>
        <p className="text-gray-600">API para la gestión del polideportivo</p>
        <div className="mt-8">
          <a 
            href="/api/health" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Verificar Estado de la API
          </a>
        </div>
      </div>
    </div>
  )
}