'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function TermsPage() {
  const [expanded, setExpanded] = useState<string[]>(['acceptance', 'service']);
  const toggle = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const lastUpdated = '15 de enero de 2025';

  const sections: Section[] = [
    {
      id: 'acceptance',
      title: '1. Aceptación de los Términos',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>El acceso y uso de la plataforma del Polideportivo Victoria Hernández implica la aceptación de estos términos y condiciones.</p>
          <p>Si no está de acuerdo con alguna de las condiciones, no deberá utilizar nuestros servicios.</p>
        </div>
      )
    },
    {
      id: 'service',
      title: '2. Descripción del Servicio',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>Prestamos servicios de reserva de canchas, membresías, torneos, clases y otros servicios deportivos presenciales y digitales.</p>
          <ul className="list-disc list-inside ml-4 text-sm">
            <li>La disponibilidad puede variar por sede, mantenimiento o condiciones externas.</li>
            <li>Algunas funcionalidades requieren cuenta de usuario verificada.</li>
            <li>Los pagos pueden ser procesados por terceros autorizados.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'registration',
      title: '3. Registro, Cuenta y Seguridad',
      content: (
        <div className="space-y-3 text-gray-700">
          <ul className="list-disc list-inside ml-4 text-sm">
            <li>Debe proporcionar información veraz y mantenerla actualizada.</li>
            <li>Usted es responsable de la confidencialidad de sus credenciales.</li>
            <li>Notifique inmediatamente sobre accesos no autorizados.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'acceptable-use',
      title: '4. Uso Aceptable',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>Está prohibido:</p>
          <ul className="list-disc list-inside ml-4 text-sm">
            <li>Utilizar el servicio con fines ilícitos.</li>
            <li>Interferir con la seguridad o disponibilidad del sistema.</li>
            <li>Suplantar identidades o manipular datos.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'ip',
      title: '5. Propiedad Intelectual',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>El software, marcas, logotipos, contenidos y diseños pertenecen al Polideportivo Victoria Hernández o a sus licenciantes.</p>
          <p>Queda prohibida su reproducción o explotación sin autorización expresa.</p>
        </div>
      )
    },
    {
      id: 'payments',
      title: '6. Precios, Pagos y Facturación',
      content: (
        <div className="space-y-3 text-gray-700">
          <ul className="list-disc list-inside ml-4 text-sm">
            <li>Los precios incluyen impuestos cuando corresponda.</li>
            <li>Los pagos pueden ser recurrentes para membresías.</li>
            <li>Las facturas se emiten electrónicamente.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'cancellations',
      title: '7. Cancelaciones y Reembolsos',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>La política de cancelación se mostrará en cada reserva y puede variar por actividad.</p>
          <p>Los reembolsos, cuando procedan, se efectuarán por el mismo medio de pago.</p>
        </div>
      )
    },
    {
      id: 'liability',
      title: '8. Limitación de Responsabilidad',
      content: (
        <div className="space-y-3 text-gray-700 text-sm">
          <p>El servicio se presta "tal cual". No garantizamos disponibilidad ininterrumpida ni ausencia de errores.</p>
          <p>En la medida permitida por la ley, nuestra responsabilidad total se limita al importe abonado por usted en los 12 meses previos al incidente.</p>
        </div>
      )
    },
    {
      id: 'privacy',
      title: '9. Privacidad y Protección de Datos',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>Tratamos sus datos conforme al <Link className="text-blue-600 underline" href="/privacy">Aviso de Privacidad</Link> y <Link className="text-blue-600 underline" href="/cookies">Política de Cookies</Link>.</p>
          <p>Cumplimos con GDPR y normativa aplicable en la UE.</p>
        </div>
      )
    },
    {
      id: 'changes',
      title: '10. Modificaciones de los Términos',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>Podemos actualizar estos términos. Le notificaremos cambios significativos con antelación razonable.</p>
        </div>
      )
    },
    {
      id: 'law',
      title: '11. Ley Aplicable y Jurisdicción',
      content: (
        <div className="space-y-3 text-gray-700">
          <p>Estos términos se rigen por la legislación española y la normativa de la Unión Europea.</p>
          <p>Las partes se someten a los juzgados y tribunales de Madrid, salvo norma imperativa en contrario.</p>
        </div>
      )
    },
    {
      id: 'contact',
      title: '12. Contacto Legal',
      content: (
        <div className="space-y-2 text-gray-700 text-sm">
          <p>📧 legal@polideportivo.com</p>
          <p>📍 Calle Principal #123, Andalucía, España</p>
        </div>
      )
    },
  ];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Términos y Condiciones - Polideportivo Victoria Hernández',
    inLanguage: 'es-ES',
    url: 'https://www.polideportivovictoriahernandez.com/terms',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Polideportivo Victoria Hernández',
      url: 'https://www.polideportivovictoriahernandez.com'
    }
  } as const;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-700" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Términos y Condiciones</h1>
            <p className="text-gray-600">Condiciones de uso de la plataforma</p>
            <p className="text-gray-500 text-sm mt-2">Última actualización: {lastUpdated}</p>
          </div>
        </div>

        {/* Índice */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Índice</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {sections.map(s => (
              <button key={s.id} onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })} className="text-left p-2 rounded text-blue-600 hover:bg-blue-50">
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button onClick={() => toggle(s.id)} className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{s.title}</h2>
                {expanded.includes(s.id) ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
              </button>
              {expanded.includes(s.id) && (
                <div className="p-6">{s.content}</div>
              )}
            </section>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/privacy" className="text-blue-600 underline mr-4">Política de Privacidad</Link>
          <Link href="/cookies" className="text-blue-600 underline">Política de Cookies</Link>
        </div>
      </div>
    </div>
  );
}



























