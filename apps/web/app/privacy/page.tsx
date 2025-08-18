'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Shield, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function PrivacyPolicyPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['introduction']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const lastUpdated = "15 de enero de 2025";

  const sections: Section[] = [
    {
      id: 'introduction',
      title: '1. Introducción',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Polideportivo Victoria Hernández respeta su privacidad y se compromete a proteger sus datos personales. 
            Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos su información 
            personal cuando utiliza nuestros servicios deportivos y plataforma digital.
          </p>
          <p className="text-gray-700">
            Esta política cumple con el Reglamento General de Protección de Datos (GDPR) de la Unión Europea, 
            la Ley Orgánica de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD) 
            de España, y las normativas locales aplicables.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-blue-800 font-medium">
              📋 Responsable del Tratamiento: Polideportivo Victoria Hernández
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Dirección: Victoria Hernández, Cesar, Colombia<br/>
              Email: protecciondatos@polideportivo.com<br/>
              Teléfono: +57 (xxx) xxx-xxxx
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-collection',
      title: '2. Información que Recopilamos',
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">2.1 Datos de Identificación Personal</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Nombre completo y apellidos</li>
              <li>Dirección de correo electrónico</li>
              <li>Número de teléfono</li>
              <li>Documento de identidad (DNI/NIE/Pasaporte)</li>
              <li>Fecha de nacimiento</li>
              <li>Dirección postal</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">2.2 Datos de Actividad Deportiva</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Reservas de canchas y horarios</li>
              <li>Historial de actividades deportivas</li>
              <li>Preferencias de deportes</li>
              <li>Datos de rendimiento y estadísticas</li>
              <li>Participación en torneos y eventos</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">2.3 Datos Técnicos y de Navegación</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Dirección IP y datos de ubicación</li>
              <li>Tipo de navegador y dispositivo</li>
              <li>Cookies y tecnologías similares</li>
              <li>Logs de acceso y uso de la plataforma</li>
              <li>Interacciones con la aplicación</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">2.4 Datos Financieros</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Información de pago (procesada por terceros seguros)</li>
              <li>Historial de transacciones</li>
              <li>Datos de facturación</li>
              <li>Información de membresías y suscripciones</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'legal-basis',
      title: '3. Base Legal del Tratamiento',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Procesamos sus datos personales basándonos en las siguientes bases legales del GDPR:
          </p>
          <div className="grid gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🤝 Ejecución de Contrato (Art. 6.1.b GDPR)</h4>
              <p className="text-gray-700 text-sm">
                Para gestionar reservas, membresías, pagos y prestar nuestros servicios deportivos.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">✅ Consentimiento (Art. 6.1.a GDPR)</h4>
              <p className="text-gray-700 text-sm">
                Para comunicaciones promocionales, cookies no esenciales y análisis de rendimiento.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">⚖️ Interés Legítimo (Art. 6.1.f GDPR)</h4>
              <p className="text-gray-700 text-sm">
                Para seguridad, prevención de fraudes, mejora de servicios y análisis estadísticos.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📋 Obligación Legal (Art. 6.1.c GDPR)</h4>
              <p className="text-gray-700 text-sm">
                Para cumplir con obligaciones fiscales, contables y de seguridad aplicables.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-usage',
      title: '4. Cómo Utilizamos sus Datos',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">Utilizamos sus datos personales para:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">🏢 Servicios Principales</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Gestionar reservas y disponibilidad</li>
                <li>Procesar pagos y facturación</li>
                <li>Administrar membresías</li>
                <li>Organizar torneos y eventos</li>
                <li>Proporcionar atención al cliente</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">📊 Mejora y Análisis</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Analizar uso de instalaciones</li>
                <li>Mejorar nuestros servicios</li>
                <li>Personalizar experiencias</li>
                <li>Generar estadísticas anónimas</li>
                <li>Investigación y desarrollo</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">📢 Comunicaciones</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Envío de confirmaciones</li>
                <li>Notificaciones importantes</li>
                <li>Marketing (con consentimiento)</li>
                <li>Encuestas de satisfacción</li>
                <li>Actualizaciones del servicio</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">🔒 Seguridad</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Prevención de fraudes</li>
                <li>Auditorías de seguridad</li>
                <li>Cumplimiento legal</li>
                <li>Protección de instalaciones</li>
                <li>Resolución de disputas</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-sharing',
      title: '5. Compartir Información',
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-yellow-800 font-medium">
              ⚠️ No vendemos, alquilamos ni comercializamos sus datos personales a terceros.
            </p>
          </div>
          <p className="text-gray-700">Podemos compartir sus datos únicamente en las siguientes circunstancias:</p>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🏦 Proveedores de Servicios</h4>
              <p className="text-gray-700 text-sm mb-2">
                Con empresas que nos ayudan a operar nuestros servicios, bajo estrictos acuerdos de confidencialidad:
              </p>
              <ul className="list-disc list-inside text-gray-700 text-sm ml-4">
                <li>Procesadores de pagos (Stripe, PayPal)</li>
                <li>Servicios de hosting y nube (AWS, Google Cloud)</li>
                <li>Proveedores de email y SMS</li>
                <li>Herramientas de análisis y estadísticas</li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">⚖️ Obligaciones Legales</h4>
              <p className="text-gray-700 text-sm">
                Cuando sea requerido por ley, orden judicial, o para proteger nuestros derechos legítimos y los de nuestros usuarios.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🔄 Transferencias Empresariales</h4>
              <p className="text-gray-700 text-sm">
                En caso de fusión, adquisición o venta de activos, con previo aviso y garantías de protección.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-security',
      title: '6. Seguridad de los Datos',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Implementamos medidas técnicas y organizativas avanzadas para proteger sus datos personales:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">🔐 Medidas Técnicas</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Cifrado SSL/TLS end-to-end</li>
                <li>Autenticación multifactor</li>
                <li>Firewalls y sistemas de detección</li>
                <li>Copias de seguridad regulares</li>
                <li>Actualizaciones de seguridad</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">👥 Medidas Organizativas</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Acceso basado en roles</li>
                <li>Capacitación en privacidad</li>
                <li>Políticas de seguridad estrictas</li>
                <li>Auditorías regulares</li>
                <li>Gestión de incidentes</li>
              </ul>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-800 font-medium">🚨 Notificación de Brechas</p>
            <p className="text-red-700 text-sm mt-1">
              En caso de brecha de seguridad que pueda afectar sus derechos, le notificaremos dentro de 72 horas 
              según requiere el GDPR, junto con las medidas adoptadas.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'user-rights',
      title: '7. Sus Derechos (GDPR)',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Bajo el GDPR, usted tiene los siguientes derechos sobre sus datos personales:
          </p>
          
          <div className="grid gap-4">
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Derecho de Acceso (Art. 15)</h4>
              <p className="text-blue-800 text-sm">
                Puede solicitar una copia de todos los datos personales que tenemos sobre usted.
              </p>
              <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline">
                Solicitar mis datos →
              </button>
            </div>

            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✏️ Derecho de Rectificación (Art. 16)</h4>
              <p className="text-green-800 text-sm">
                Puede corregir datos inexactos o completar información incompleta.
              </p>
              <Link href="/dashboard/settings" className="mt-2 inline-block text-green-600 hover:text-green-800 text-sm underline">
                Actualizar mi perfil →
              </Link>
            </div>

            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <h4 className="font-semibold text-red-900 mb-2">🗑️ Derecho de Supresión (Art. 17)</h4>
              <p className="text-red-800 text-sm">
                Puede solicitar la eliminación de sus datos cuando ya no sean necesarios.
              </p>
              <button className="mt-2 text-red-600 hover:text-red-800 text-sm underline">
                Eliminar mi cuenta →
              </button>
            </div>

            <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">⏸️ Derecho de Limitación (Art. 18)</h4>
              <p className="text-yellow-800 text-sm">
                Puede restringir el procesamiento de sus datos en ciertas circunstancias.
              </p>
            </div>

            <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">📦 Derecho de Portabilidad (Art. 20)</h4>
              <p className="text-purple-800 text-sm">
                Puede obtener sus datos en formato estructurado para transferir a otro servicio.
              </p>
              <button className="mt-2 text-purple-600 hover:text-purple-800 text-sm underline">
                Exportar mis datos →
              </button>
            </div>

            <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">🚫 Derecho de Oposición (Art. 21)</h4>
              <p className="text-orange-800 text-sm">
                Puede oponerse al procesamiento basado en interés legítimo o para marketing directo.
              </p>
              <Link href="/dashboard/settings" className="mt-2 inline-block text-orange-600 hover:text-orange-800 text-sm underline">
                Gestionar comunicaciones →
              </Link>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-blue-800 font-medium mb-2">📞 Ejercer sus Derechos</p>
            <p className="text-blue-700 text-sm">
              Para ejercer cualquiera de estos derechos, contáctenos en <strong>protecciondatos@polideportivo.com</strong>. 
              Responderemos en un plazo máximo de 30 días naturales.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'retention',
      title: '8. Retención de Datos',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Conservamos sus datos personales únicamente durante el tiempo necesario para los fines establecidos:
          </p>
          
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tipo de Datos</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Período de Retención</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Base Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Datos de cuenta activa</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Mientras mantenga la cuenta</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Ejecución de contrato</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">Historial de reservas</td>
                    <td className="px-4 py-3 text-sm text-gray-700">7 años tras última actividad</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Obligación fiscal</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Datos financieros</td>
                    <td className="px-4 py-3 text-sm text-gray-700">10 años</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Obligación contable</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">Logs de seguridad</td>
                    <td className="px-4 py-3 text-sm text-gray-700">2 años</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Interés legítimo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700">Datos de marketing</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Hasta retirar consentimiento</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Consentimiento</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-green-800 font-medium">🗑️ Eliminación Automática</p>
            <p className="text-green-700 text-sm mt-1">
              Nuestros sistemas eliminan automáticamente los datos cuando expiran los períodos de retención, 
              excepto cuando existan obligaciones legales que requieran conservación adicional.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'international-transfers',
      title: '9. Transferencias Internacionales',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Sus datos pueden ser transferidos y procesados fuera del Espacio Económico Europeo (EEE) 
            únicamente con las siguientes garantías:
          </p>
          
          <div className="space-y-4">
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">🌍 Países con Decisión de Adecuación</h4>
              <p className="text-blue-800 text-sm">
                Transferimos datos a países que la Comisión Europea considera con nivel adecuado de protección.
              </p>
            </div>

            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">📜 Cláusulas Contractuales Tipo (SCCs)</h4>
              <p className="text-green-800 text-sm">
                Utilizamos las Cláusulas Contractuales Tipo aprobadas por la UE para garantizar protección equivalente.
              </p>
            </div>

            <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">🛡️ Certificaciones Internacionales</h4>
              <p className="text-purple-800 text-sm">
                Nuestros proveedores cuentan con certificaciones como ISO 27001, SOC 2 Type II, y marcos de privacidad reconocidos.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-yellow-800 font-medium">📋 Proveedores Principales</p>
            <ul className="text-yellow-700 text-sm mt-2 space-y-1">
              <li>• <strong>AWS (Amazon)</strong>: Hosting en región EU (Frankfurt/Dublín)</li>
              <li>• <strong>Google Cloud</strong>: Servicios de análisis en región EU</li>
              <li>• <strong>Stripe</strong>: Procesamiento de pagos (Irlanda)</li>
              <li>• <strong>SendGrid</strong>: Comunicaciones por email (con SCCs)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'cookies',
      title: '10. Cookies y Tecnologías Similares',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Utilizamos cookies y tecnologías similares para mejorar su experiencia. Para información detallada, 
            consulte nuestra <Link href="/cookies" className="text-blue-600 hover:text-blue-800 underline">Política de Cookies</Link>.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🔧 Cookies Técnicas (Necesarias)</h4>
              <p className="text-gray-700 text-sm">
                Esenciales para el funcionamiento básico del sitio web. No requieren consentimiento.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">📊 Cookies Analíticas</h4>
              <p className="text-gray-700 text-sm">
                Para estadísticas anónimas de uso. Requieren consentimiento según la ley de cookies.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 Cookies de Marketing</h4>
              <p className="text-gray-700 text-sm">
                Para personalización y publicidad relevante. Siempre requieren consentimiento explícito.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">⚙️ Cookies de Preferencias</h4>
              <p className="text-gray-700 text-sm">
                Para recordar configuraciones y preferencias del usuario.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-blue-800 font-medium">🍪 Gestión de Cookies</p>
            <p className="text-blue-700 text-sm mt-1">
              Puede gestionar sus preferencias de cookies en cualquier momento através de nuestro 
              centro de preferencias o la configuración de su navegador.
            </p>
            <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors">
              Gestionar Cookies
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'minors',
      title: '11. Protección de Menores',
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-800 font-medium">👶 Edad Mínima: 14 años</p>
            <p className="text-red-700 text-sm mt-1">
              Nuestros servicios están dirigidos a personas de 14 años o más. No recopilamos 
              intencionalmente datos de menores de 14 años sin consentimiento parental.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Menores de 14 a 16 años</h4>
            <p className="text-gray-700 text-sm">
              Para menores entre 14 y 16 años, requerimos:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
              <li>Consentimiento verificable de padres o tutores legales</li>
              <li>Documentación que acredite la autorización parental</li>
              <li>Supervisión parental en el uso de servicios</li>
              <li>Limitaciones en el procesamiento de datos personales</li>
            </ul>

            <h4 className="font-semibold text-gray-900 mt-4">Derechos Especiales para Menores</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
              <li>Derecho reforzado al olvido y supresión de datos</li>
              <li>Protección especial contra perfilado y marketing directo</li>
              <li>Evaluaciones de impacto específicas para menores</li>
              <li>Interfaz diseñada con protecciones adicionales</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-yellow-800 font-medium">⚠️ Si Detectamos Datos de Menores no Autorizados</p>
            <p className="text-yellow-700 text-sm mt-1">
              Eliminaremos inmediatamente los datos y suspenderemos la cuenta hasta obtener 
              la autorización parental correspondiente.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'complaints',
      title: '12. Reclamaciones y Autoridades de Control',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Si no está satisfecho con cómo hemos manejado sus datos personales, puede:
          </p>

          <div className="space-y-4">
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">1️⃣ Contactar Nuestro DPO</h4>
              <div className="text-blue-800 text-sm space-y-1">
                <p><strong>Delegado de Protección de Datos (DPO)</strong></p>
                <p>📧 Email: dpo@polideportivo.com</p>
                <p>📞 Teléfono: +57 (xxx) xxx-xxxx ext. 101</p>
                <p>📬 Dirección: Victoria Hernández, Cesar, Colombia</p>
              </div>
            </div>

            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">2️⃣ Autoridades de Protección de Datos</h4>
              <div className="text-green-800 text-sm space-y-2">
                <div>
                  <p><strong>🇪🇸 España - Agencia Española de Protección de Datos (AEPD)</strong></p>
                  <p>Web: <a href="https://www.aepd.es" className="underline" target="_blank" rel="noopener noreferrer">www.aepd.es</a></p>
                  <p>Teléfono: 901 100 099</p>
                </div>
                <div>
                  <p><strong>🇨🇴 Colombia - Superintendencia de Industria y Comercio (SIC)</strong></p>
                  <p>Web: <a href="https://www.sic.gov.co" className="underline" target="_blank" rel="noopener noreferrer">www.sic.gov.co</a></p>
                  <p>Teléfono: (+57 1) 587 0000</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
            <p className="text-purple-800 font-medium">⚖️ Derecho a Presentar Reclamación</p>
            <p className="text-purple-700 text-sm mt-1">
              Tiene derecho a presentar una reclamación ante la autoridad de protección de datos 
              competente sin perjuicio de cualquier otro recurso administrativo o judicial.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'updates',
      title: '13. Actualizaciones de la Política',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar cambios en:
          </p>
          
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Nuestras prácticas de procesamiento de datos</li>
            <li>Cambios normativos (GDPR, LOPDGDD, etc.)</li>
            <li>Nuevas funcionalidades o servicios</li>
            <li>Mejoras en seguridad y protección</li>
            <li>Recomendaciones de autoridades supervisoras</li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-blue-800 font-medium">📬 Notificación de Cambios</p>
            <p className="text-blue-700 text-sm mt-1">
              Le notificaremos los cambios significativos por email y mediante aviso prominente 
              en nuestro sitio web con al menos 30 días de antelación a su entrada en vigor.
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-green-800 font-medium">📅 Historial de Versiones</p>
            <p className="text-green-700 text-sm mt-1">
              Mantenemos un registro de todas las versiones anteriores de esta política para 
              garantizar transparencia y trazabilidad de los cambios.
            </p>
            <button className="mt-2 text-green-600 hover:text-green-800 text-sm underline">
              Ver historial de cambios →
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: '14. Información de Contacto',
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Responsable del Tratamiento
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Polideportivo Victoria Hernández</strong></p>
                <p className="flex items-center"><MapPin className="w-4 h-4 mr-2" />Victoria Hernández, Cesar, Colombia</p>
                <p className="flex items-center"><Mail className="w-4 h-4 mr-2" />protecciondatos@polideportivo.com</p>
                <p className="flex items-center"><Phone className="w-4 h-4 mr-2" />+57 (xxx) xxx-xxxx</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-green-600" />
                Delegado de Protección de Datos (DPO)
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>María García López</strong></p>
                <p>Certificación IAPP CIPP/E</p>
                <p className="flex items-center"><Mail className="w-4 h-4 mr-2" />dpo@polideportivo.com</p>
                <p className="flex items-center"><Phone className="w-4 h-4 mr-2" />+57 (xxx) xxx-xxxx ext. 101</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">🕐 Horarios de Atención</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p><strong>Consultas Generales:</strong></p>
                <p>Lunes a Viernes: 8:00 - 18:00 COT</p>
                <p>Sábados: 8:00 - 14:00 COT</p>
              </div>
              <div>
                <p><strong>Urgencias de Privacidad:</strong></p>
                <p>24/7 vía email</p>
                <p>Respuesta máxima: 24 horas</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              <strong>Última actualización:</strong> {lastUpdated}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Esta política es efectiva desde la fecha de última actualización y reemplaza todas las versiones anteriores.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Política de Privacidad
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Protección de Datos Personales según GDPR y LOPDGDD
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">GDPR Compliant</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">LOPDGDD</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">ISO 27001</span>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">Actualizada 2025</span>
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Navegación Rápida</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left p-2 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 flex items-center justify-between"
              >
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                {expandedSections.includes(section.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {expandedSections.includes(section.id) && (
                <div className="p-6">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">¿Necesita Ayuda con sus Datos?</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard/settings"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <Shield className="w-4 h-4 mr-2" />
                Gestionar mi Privacidad
              </Link>
              <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Contactar DPO
              </button>
              <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                Exportar mis Datos
              </button>
            </div>
          </div>
        </div>

        {/* Back to Top */}
        <div className="text-center mt-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            ↑ Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
