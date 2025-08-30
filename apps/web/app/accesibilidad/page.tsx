'use client';

import { Accessibility } from 'lucide-react';

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3">
            <Accessibility className="w-8 h-8 text-purple-700" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Declaración de Accesibilidad</h1>
              <p className="text-gray-600">Compromiso con WCAG 2.1 AA</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <p className="text-gray-700">Nos comprometemos a hacer que nuestro sitio web y aplicaciones sean accesibles para el mayor número de personas, incluyendo personas con discapacidades, siguiendo las pautas WCAG 2.1 nivel AA.</p>
          <ul className="list-disc list-inside text-gray-700 ml-4">
            <li>Contrastes adecuados y tipografías legibles</li>
            <li>Navegación por teclado y enfoque visible</li>
            <li>Etiquetas ARIA y semántica correcta</li>
            <li>Compatibilidad con lectores de pantalla</li>
            <li>Contenido y controles accesibles en móviles</li>
          </ul>
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 text-sm text-purple-900">
            <p><strong>Feedback de Accesibilidad:</strong> Si encuentra barreras o problemas de accesibilidad, escríbanos a accesibilidad@polideportivo.com. Atendemos solicitudes razonables de adaptación.</p>
          </div>
          <div className="text-sm text-gray-600">
            <p>Última revisión: 15 de enero de 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}














