"use client";

import { useRouter } from "next/navigation";

export function ActivitiesSection() {
  const router = useRouter();
  const activities = [
    {
      title: "Clases Dirigidas",
      description: "Entrenamientos grupales con instructores certificados",
      icon: "fas fa-users",
      schedule: "Lun-Vie 6:00-22:00"
    },
    {
      title: "Torneos",
      description: "Competencias regulares en todas las disciplinas",
      icon: "fas fa-medal",
      schedule: "Fines de semana"
    },
    {
      title: "Eventos Especiales",
      description: "Celebraciones deportivas y actividades familiares",
      icon: "fas fa-calendar-star",
      schedule: "Fechas especiales"
    },
    {
      title: "Escuelas Deportivas",
      description: "Formación deportiva para niños y jóvenes",
      icon: "fas fa-graduation-cap",
      schedule: "Lun-Sáb 15:00-18:00"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-emerald-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Actividades & <span className="text-emerald-600">Eventos</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Participa en nuestras actividades programadas y eventos especiales diseñados para toda la familia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {activities.map((activity, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <i className={`${activity.icon} text-white text-2xl`}></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{activity.title}</h3>
              <p className="text-gray-600 mb-4">{activity.description}</p>
              <div className="flex items-center text-emerald-600 font-medium">
                <i className="fas fa-clock mr-2"></i>
                <span className="text-sm">{activity.schedule}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button 
            onClick={() => router.push('/dashboard/activities')}
            className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <i className="fas fa-calendar-plus mr-2"></i>
            Ver Calendario Completo
          </button>
        </div>
      </div>
    </section>
  );
}