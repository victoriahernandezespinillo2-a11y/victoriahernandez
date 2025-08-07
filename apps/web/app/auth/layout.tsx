import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Autenticación - Polideportivo Oroquieta',
  description: 'Inicia sesión o regístrate en Polideportivo Oroquieta',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="flex min-h-screen">
        {/* Lado izquierdo - Imagen/Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-green-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">Polideportivo Oroquieta</h1>
              <p className="text-xl mb-8 opacity-90">
                Tu centro deportivo de confianza
              </p>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold">500+</div>
                  <div className="opacity-80">Miembros Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">15</div>
                  <div className="opacity-80">Canchas Disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="opacity-80">Acceso Premium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">10+</div>
                  <div className="opacity-80">Deportes</div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="absolute top-1/2 right-10 w-16 h-16 bg-white/10 rounded-full"></div>
        </div>

        {/* Lado derecho - Formulario */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}