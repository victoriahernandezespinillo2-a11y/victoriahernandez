export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">
          Polideportivo Oroquieta
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Plataforma de gestión deportiva moderna
        </p>
        <div className="space-x-4">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">
            Reservar Cancha
          </button>
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">
            Ver Horarios
          </button>
        </div>
      </div>
    </div>
  )
}