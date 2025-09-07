"use client";

import { useRouter } from "next/navigation";
import { useLandingData } from "@/src/hooks/useLandingData";
import { useState } from "react";

export function InfoSection() {
  const router = useRouter();
  const { infoCards, faqs, loading } = useLandingData();
  const [openId, setOpenId] = useState<string | null>(null);



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
          {infoCards.map((card) => {
            const normalizedIcon = card.icon && card.icon.includes('fa')
              ? card.icon
              : `fas fa-${(card.icon || 'info-circle')}`;
            // Corrección de dirección en tiempo de render para evitar datos desactualizados del seed
            const isUbicacion = (card.title || '').toLowerCase().includes('ubicación');
            const fixedDescription = isUbicacion ? 'Ubicación oficial del centro' : card.description;
            const fixedContent = isUbicacion
              ? 'Polideportivo Victoria Hernández\nCALLE CONSENSO, 5, 28041 Madrid, España\nLos Rosales, Villaverde'
              : card.content;
            return (
              <div key={card.id} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <i className={`${normalizedIcon} text-white text-2xl`} aria-hidden="true"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 break-words">{card.title}</h3>
                <p className="text-emerald-600 font-medium mb-3 break-words">{fixedDescription}</p>
                <p className="text-gray-600 text-sm whitespace-pre-line break-words max-h-40 overflow-y-auto pr-1">{fixedContent}</p>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl p-8 lg:p-12" id="faqs">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Preguntas <span className="text-emerald-600">Frecuentes</span>
            </h3>
            <p className="text-lg text-gray-600">
              Resolvemos las dudas más comunes de nuestros usuarios
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {faqs && faqs.length > 0 ? (
              <div className="divide-y divide-gray-200 rounded-2xl bg-white shadow-md">
                {faqs.map((faq, index) => {
                  const isOpen = openId === faq.id;
                  const panelId = `faq-panel-${faq.id}`;
                  const buttonId = `faq-button-${faq.id}`;
                  return (
                    <div key={faq.id} className="p-0">
                      <h4 className="m-0">
                        <button
                          id={buttonId}
                          type="button"
                          className="w-full text-left px-6 py-5 flex items-start justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => setOpenId(isOpen ? null : faq.id)}
                        >
                          <span className="flex items-start">
                            <i className="fas fa-question-circle text-emerald-500 mr-3 mt-1" aria-hidden="true"></i>
                            <span className="text-base md:text-lg font-semibold text-gray-900">
                              {faq.question}
                            </span>
                          </span>
                          <span className={`ml-4 transform transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} aria-hidden="true">
                            <i className="fas fa-chevron-down text-gray-500"></i>
                          </span>
                        </button>
                      </h4>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className={`px-6 pb-5 text-gray-600 transition-[max-height,opacity] duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
                      >
                        <p className="pl-8">{faq.answer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay preguntas frecuentes disponibles</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => {
                const el = document.getElementById('contacto');
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top, behavior: 'smooth' });
                }
              }}
              className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <i className="fas fa-comments mr-2"></i>
              ¿Tienes más preguntas?
            </button>
          </div>

          {/* Datos estructurados FAQPage para SEO */}
          {faqs && faqs.length > 0 && (
            <script
              type="application/ld+json"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqs.map((f: any) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: { "@type": "Answer", text: f.answer },
                  })),
                }),
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}