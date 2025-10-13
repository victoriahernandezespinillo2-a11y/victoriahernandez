'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Cookie, Settings2, CheckCircle2, XCircle } from 'lucide-react';

type Consent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const DEFAULT_CONSENT: Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

export default function CookiesPolicyPage() {
  const [consent, setConsent] = useState<Consent>(DEFAULT_CONSENT);
  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('cookie_consent') : null;
      if (stored) setConsent(JSON.parse(stored));
    } catch {}
  }, []);

  const save = (next: Consent) => {
    setConsent(next);
    try {
      localStorage.setItem('cookie_consent', JSON.stringify(next));
      document.cookie = `cookie_consent=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=${60*60*24*180}`;
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ event: 'consent_update', consent: next });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3">
            <Cookie className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Política de Cookies</h1>
              <p className="text-gray-600">Transparencia y control conforme al GDPR y la Ley de Cookies</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">¿Qué son las cookies?</h2>
          <p className="text-gray-700">Las cookies son pequeños archivos que se almacenan en su dispositivo para recordar información sobre su visita.</p>
          <ul className="list-disc list-inside text-sm text-gray-700 ml-4 mt-2">
            <li><strong>Técnicas (necesarias):</strong> Imprescindibles para el funcionamiento del sitio.</li>
            <li><strong>Preferencias:</strong> Recuerdan sus elecciones (idioma, zona horaria).</li>
            <li><strong>Analíticas:</strong> Ayudan a entender cómo se usa el sitio (estadísticas).</li>
            <li><strong>Marketing:</strong> Personalizan la publicidad.</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Settings2 className="w-5 h-5"/> Preferencias de Cookies</h2>
          <div className="space-y-3">
            {[
              { key: 'necessary', label: 'Técnicas (necesarias)', desc: 'Siempre activas. Requeridas para el funcionamiento del sitio.' },
              { key: 'preferences', label: 'Preferencias', desc: 'Recuerda tus opciones (idioma, región, accesibilidad).' },
              { key: 'analytics', label: 'Analíticas', desc: 'Medición de uso y rendimiento (anonimizada cuando sea posible).' },
              { key: 'marketing', label: 'Marketing', desc: 'Personalización de anuncios y retargeting.' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.key === 'necessary' ? true : (consent as any)[item.key]}
                    onChange={(e) => save({ ...consent, [item.key]: e.target.checked })}
                    disabled={item.key === 'necessary'}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 ${item.key==='necessary' ? 'bg-gray-300' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                </label>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => save({ necessary: true, preferences: true, analytics: true, marketing: true })} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Aceptar todas</button>
            <button onClick={() => save({ necessary: true, preferences: false, analytics: false, marketing: false })} className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 text-sm flex items-center gap-2"><XCircle className="w-4 h-4"/> Rechazar no esenciales</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Gestión desde el navegador</h2>
          <p className="text-gray-700">Puede configurar su navegador para bloquear o eliminar cookies. Consulte:</p>
          <ul className="list-disc list-inside text-sm text-blue-700 ml-4 mt-2">
            <li><a className="underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer">Google Chrome</a></li>
            <li><a className="underline" href="https://support.mozilla.org/es/kb/Borrar%20cookies" target="_blank" rel="noreferrer">Mozilla Firefox</a></li>
            <li><a className="underline" href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer">Safari</a></li>
            <li><a className="underline" href="https://support.microsoft.com/es-es/topic/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noreferrer">Microsoft Edge</a></li>
          </ul>
        </div>

        <div className="text-center text-sm text-gray-600">
          Consulte también nuestra <Link href="/privacy" className="text-blue-600 underline">Política de Privacidad</Link> y <Link href="/terms" className="text-blue-600 underline">Términos y Condiciones</Link>.
        </div>
      </div>
    </div>
  );
}


























































