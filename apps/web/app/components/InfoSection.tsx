"use client";

import { useRouter } from "next/navigation";
import { useLandingData } from "@/src/hooks/useLandingData";

export function InfoSection() {
  const router = useRouter();
  const { infoCards, faqs, loading } = useLandingData();



  // Si no hay datos o está cargando, mostrar skeleton
  if (loading || !infoCards || infoCards.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="animate-pulse">
            <div className="text-center mb-16">
              <div className="h-12 bg-gray-200 rounded w-1/2 mx-auto mb-6"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-2xl p-8 h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Información General */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            <span className="text-emerald-600">Información</span> General
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Todo lo que necesitas saber sobre nuestro polideportivo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {infoCards.map((card) => (
            <div key={card.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <i className={`${card.icon} text-white text-2xl`}></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
              <p className="text-emerald-600 font-medium mb-4">{card.description}</p>
              <p className="text-gray-600 text-sm whitespace-pre-line">{card.content}</p>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl p-8 lg:p-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Preguntas <span className="text-emerald-600">Frecuentes</span>
            </h3>
            <p className="text-lg text-gray-600">
              Resolvemos las dudas más comunes de nuestros usuarios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs && faqs.length > 0 ? faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-xl p-6 shadow-md">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-start">
                  <i className="fas fa-question-circle text-emerald-500 mr-3 mt-1"></i>
                  {faq.question}
                </h4>
                <p className="text-gray-600 ml-8">{faq.answer}</p>
              </div>
            )) : (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">No hay preguntas frecuentes disponibles</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => router.push('/contact')}
              className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <i className="fas fa-comments mr-2"></i>
              ¿Tienes más preguntas?
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}